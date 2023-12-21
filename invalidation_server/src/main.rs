// Designed and written by Aidan F223129

use actix_web::body::BoxBody;
use actix_web::{Responder, web, HttpServer, App, route, HttpResponse, rt};
use bloomfilter::Bloom;
use time::{format_description, OffsetDateTime};
use std::collections::HashMap;
use std::hash::{Hasher, BuildHasherDefault};
use std::time::{Instant, Duration};
use std::sync::{Arc, Mutex};

// TODO: put these in env or cli or smth
const EXPECTED_ITEMS: usize = 1_000;
const FALSE_POSITIVE_RATE: f64 = 0.0001; // 0.01%
const MIN_LIFETIME: u64 = 60 * 30; // 30 minutes
const GARBAGE_COLLECTION_CYCLE_TIME: u64 = MIN_LIFETIME + 60; // 30 minutes + 1 minute
const BIND_ADDR: &str = "localhost";
const BIND_PORT: u16 = 4231;

struct RotatingBloomFilter {
    active_filter: usize,
    dead_filter: usize,
    rotation_period: Duration,
    last_rotation: Instant,
    rotated: bool,
    
    filters: [Bloom<u128>; 2],
}

struct State {
    bf: RotatingBloomFilter,
    map: ExpiringHashMap,
    startup: OffsetDateTime,
}

struct ExpiringHashMap {
    map: HashMap<u128, OffsetDateTime, BuildU128FakeHasher>,
    min_lifetime: Duration,
}

type BuildU128FakeHasher = BuildHasherDefault<U128FakeHasher>;

#[derive(Default)]
struct U128FakeHasher(u64);

impl Hasher for U128FakeHasher {
    fn finish(&self) -> u64 {
        return self.0
    }

    fn write_u128(&mut self, i: u128) {
        self.0 = i as u64;
    }

    fn write(&mut self,  _bytes: &[u8]) {
        panic!("Write should not be called itself")
    }
}

fn get_current_time() -> String {
    let now = time::OffsetDateTime::now_local();
    let fmt = format_description::parse("[hour]:[minute]:[second] on [day]/[month]/[year]").unwrap();
    match now {
        Ok(time) => time.format(&fmt).unwrap(),
        Err(_) => String::from("NO TIME")

    }
}

impl ExpiringHashMap {
    fn new(min_expiration: u64) -> Self {
        Self {
            map: HashMap::with_hasher(BuildU128FakeHasher::default()),
            min_lifetime: Duration::from_secs(min_expiration)
        }
    }

    fn get(&mut self, id: u128) -> Option<i64> {
        let inserted =self.map.get(&id)?;
        let dur = OffsetDateTime::now_utc() - *inserted;
        match dur < self.min_lifetime {
            true => Some(inserted.unix_timestamp()),
            false => None,
        }
    }

    fn set(&mut self, id: u128, time: OffsetDateTime) {
        self.map.insert(id, time);
    }
}

impl RotatingBloomFilter {
    fn new(expected_items: usize, false_positive_rate: f64, rotation_period: u64) -> Self {
        Self {
            active_filter: 0,
            dead_filter: 1,
            rotation_period: Duration::from_secs(rotation_period),
            last_rotation: Instant::now(),
            rotated: false,
            filters: [
                Bloom::new_for_fp_rate(expected_items, false_positive_rate),
                Bloom::new_for_fp_rate(expected_items, false_positive_rate),
            ],
        }
    }

    fn rotate_filters_if_needed(&mut self) {
        if !self.rotated && (self.last_rotation.elapsed() > self.rotation_period) {
            println!("Rotated filters at {}", get_current_time());
            self.rotated = true;
            (self.active_filter, self.dead_filter) = (self.dead_filter, self.active_filter); 
        }
        if self.last_rotation.elapsed() > self.rotation_period * 2 {
            let before = Instant::now();
            self.rotated = false;
            self.filters[self.dead_filter].clear(); 
            self.last_rotation = Instant::now();
            println!("Purged dead filter in {:?} at {}", before.elapsed(), get_current_time());
        }
    }

    fn set(&mut self, item: u128) {
        self.rotate_filters_if_needed();
        self.filters[self.active_filter].set(&item);
    }

    fn check(&mut self, item: u128) -> bool {
        self.rotate_filters_if_needed();
        for filter in self.filters.iter() {
            if filter.check(&item) {
                return true;
            }
        }
        false
    }
}

#[route("/check/{session_id}/{account_id}", method="GET")]
async fn check(path: web::Path<(String, String)>, data: web::Data<Arc<Mutex<State>>>) -> impl Responder {
    
    
    // UNIX TIMESTAMP IS FLOORED INT SO WE ARE SAFE TO RETURN IT
    // WE NEVER REPORT THAT SOMETHING WAS INVALIDATED AFTER IT WAS
    // OTHERWISE SESSIONS ISSUED JUST BEFORE INVALIDATION COULD BE VALID
    // FALSE INVALIDATION IS BETTER THAN FALSE VALIDATION.



    let account_id = match u128::from_str_radix(&path.1, 16) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().finish(),
    };

    let session_id = match u128::from_str_radix(&path.0, 16) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().finish(),
    };

    let mut state = data.lock().unwrap();


    // if the server has been running for less than the minimum lifetime
    // we cannot be authoritive as we do not have enough info
    // therefore we must treat all sessions before we started as invalid
    let startup_invalid = {
        if OffsetDateTime::now_utc() - state.startup < state.map.min_lifetime {
            state.startup.unix_timestamp()
        } else {
            0
        }
    };

    // check for session blacklist
    {
        let filter = &mut state.bf;
        if filter.check(session_id) {
            return HttpResponse::NoContent().finish()
        }
    }

    // check for account blacklist
    let account_valid = {
        if let Some(invalidated_at) = state.map.get(account_id) {
            invalidated_at
        } else {
            0
        }
    };


    // if the account was invalidated after the server started but before the server is fully authoritive
    // we must return the most recent update.
    let most_recent_invalidation = std::cmp::max(startup_invalid, account_valid);
    if most_recent_invalidation > 0 {

        let body = format!("{}", most_recent_invalidation);
        return HttpResponse::Ok().message_body(BoxBody::new(body)).unwrap()
    }


    HttpResponse::NotFound().finish()
}


#[route("/set/account/{id}", method="POST")]
async fn set_account(path: web::Path<String>, data: web::Data<Arc<Mutex<State>>>) -> impl Responder {

    let id = match u128::from_str_radix(&path, 16) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().finish(),
    };

    data.lock().unwrap().map.set(id, OffsetDateTime::now_utc());
    println!("Inserting account {}", &path);
    HttpResponse::Ok().finish()
}

#[route("/set/session/{id}", method="POST")]
async fn set_session(path: web::Path<String>, data: web::Data<Arc<Mutex<State>>>) -> impl Responder {
    
    let id = match u128::from_str_radix(&path, 16) {
        Ok(id) => id,
        Err(_) => return HttpResponse::BadRequest().finish(),
    };

    data.lock().unwrap().bf.set(id);
    println!("Inserting session {}", &path);
    HttpResponse::Ok().finish()
}

#[actix_web::main]
async fn main() -> std::io::Result<()>{
    let bf = RotatingBloomFilter::new(
        EXPECTED_ITEMS,
        FALSE_POSITIVE_RATE,
        MIN_LIFETIME,
    );

    let map = ExpiringHashMap::new(MIN_LIFETIME);

    let state = State {
        bf,
        map,
        startup: OffsetDateTime::now_utc(),
    };

    let lock = Arc::new(Mutex::new(state));

    let data = web::Data::new(lock);

    println!("Starting server on {}:{} at {}", BIND_ADDR, BIND_PORT, get_current_time());

    rt::spawn(garbage_collector(data.clone()));

    HttpServer::new(move || {
        App::new()
            .app_data(data.clone())
            .service(check)
            .service(set_account)
            .service(set_session)
    })
    .bind((BIND_ADDR, BIND_PORT))?
    .run()
    .await

}


async fn garbage_collector(state: web::Data<Arc<Mutex<State>>>) {
    loop {
        rt::time::sleep(Duration::from_secs(GARBAGE_COLLECTION_CYCLE_TIME)).await;
        let mut state = state.lock().unwrap();
        let lifetime = state.map.min_lifetime;

        let before = Instant::now();

        // rotate filters
        state.bf.rotate_filters_if_needed();

        // drop dead accounts
        state.map.map.retain(|_, v| {
            let dur = OffsetDateTime::now_utc() - *v;
            dur < lifetime
        });

        drop(state);

        println!("Garbage collected in {:?} at {}", before.elapsed(), get_current_time());
    }
}
