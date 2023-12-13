<?php
// generic tables

const TASK_STATE_TODO = 0;
const TASK_STATE_INPROGRESS = 1;
const TASK_STATE_COMPLETED = 2;

const TASK_VALID_STATES = [TASK_STATE_TODO, TASK_STATE_INPROGRESS, TASK_STATE_COMPLETED];

const TAG_COLOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];


enum NOTIFICATION_TYPE {
    const POST_UPDATE = 0;
    const TASK_UPDATE = 1;
};

enum TASK_UPDATE_TYPE {
    const CREATED = 0;
    const EDITED = 1;
    const ASSIGNED = 2;
    const UNASSIGNED = 3;
}


function prepend_col_prefixes(Table $table, Array $body) {
    $prefix = $table->column_prefix;

    if ($prefix === null) {
        return $body;
    }
    $prefixed = [];

    foreach ($body as $key => $value) {
        $col = $table->get_column($key);

        if ($col->dont_friendly_name) {
            $prefixed[$key] = $value;
        } else {
            $prefixed[$prefix . $key] = $value;
        }
    }
    return $prefixed;
}


// actual OOP wizardry


class Union {
    public Table $parent;
    private Array $mapping;
    private Column $discriminator;
    public string $friendly_name;

    public function __construct(Table $parent, Array $mapping, string $discriminator, string $friendly_name) {
        $this->parent = $parent;
        $this->mapping = $mapping;
        $this->friendly_name = $friendly_name;

        $this->discriminator = $parent->get_column($discriminator) ?? respond_illegal_implementation(
            "Union discriminator column " . $discriminator . " does not exist in parent table " . $parent->name
        );

    }

    public function determine_format_from_row($row) {
        $type = $row[$this->discriminator->name];

        if (!isset($this->mapping[$type])) {
            respond_illegal_implementation("Union mapping does not contain a mapping for type " . $type);
        }

        return $this->mapping[$type];
    }
}


class Table {
    public string $name;
    private Array $url_specifiers;
    public Array $columns;
    public string $friendly_name;
    public ?string $column_prefix;

    public function __construct(
        string $name, 
        Array $url_specifiers, 
        Array $columns, 
        string $friendly_name,
        ?string $column_prefix
    ) {
        $this->name = $name;
        $this->url_specifiers = $url_specifiers;
        $this->friendly_name = $friendly_name;
        $this->columns = $columns;
        $this->column_prefix = $column_prefix;
        foreach ($columns as $column) {
            $column->parent = $this;
        }
    }

    public function get_column(string $name) {
        foreach ($this->columns as $column) {
            if ($column->name == $name) {
                return $column;
            }
        }
        return null;
    }

    public function get_primary_keys() {
        $keys = [];
        foreach ($this->columns as $column) {
            if ($column->is_primary_key) {
                $keys[] = $column;
            }
        }
        return $keys;
    }

    public function name_url_specifiers($provided_specifiers) {
        $named = [];
        for ($i = 0; $i < count($provided_specifiers); $i++) {
            $col = $this->get_column($this->url_specifiers[$i]);

            $named[$col->name] = $provided_specifiers[$i];
        }

        return $named;
    }
}

class Column {
    public bool $is_primary_key;
    public string $name;
    public string $type;
    public bool $is_nullable;
    public bool $is_editable;
    public bool $is_server_generated;
    public array $constraints;
    public bool $dont_friendly_name;
    public Table $parent;

    public function __construct(
        string $name,
        bool $is_primary_key,
        string $type,
        bool $is_nullable,
        bool $is_editable,
        bool $is_server_generated,
        array $constraints = [],
        bool $dont_friendly_name = false
    ) {
        $this->name = $name;
        $this->is_primary_key = $is_primary_key;
        $this->type = $type;
        $this->is_nullable = $is_nullable;
        $this->is_editable = $is_editable;
        $this->is_server_generated = $is_server_generated;
        $this->constraints = $constraints;
        $this->dont_friendly_name = $dont_friendly_name;
    }

    public function get_constraints($constraint_type) {
        return array_filter($this->constraints, function($constraint) use($constraint_type) {
            return is_a($constraint, $constraint_type);
        });
    }
}

abstract class Constraint {
    public abstract function validate(string $user_column, $user_field);
}

class ForeignKeyConstraint extends Constraint {
    public Table $foreign_table;
    public Column $foreign_column;
    public $validity_function;

    public function __construct(Table $foreign_table, Column $foreign_column, callable $validity_function=null) {
        $this->foreign_table = $foreign_table;
        $this->foreign_column = $foreign_column;
        $this->validity_function = $validity_function;
    }

    public function validate(string $user_column, $user_field) {

        //error_log("running foreign key constraint on" . $user_column . ":" . $user_field);

        $func = $this->validity_function;

        if ($func == null) {
            respond_illegal_implementation("validity function for " . $user_column ." is null and should not be called");
        }

        if (!is_callable($func)) {
            respond_illegal_implementation("validity function for " . $user_column . " is not callable");
        }

        if (!$func($user_field)) {
            respond_bad_request(
                "Invalid value for field ". $user_column ." Expected it to reference a snowflake from ". $this->foreign_table->name .".". $this->foreign_column->name,
                ERROR_BODY_SNOWFLAKE_DOESNT_REFERENCE
            );
        }

    }
}

class RestrictedDomainConstraint extends Constraint {
    public array $domain;

    public function __construct(array $domain) {
        $this->domain = $domain;
    }

    public function validate(string $user_column, $user_field) {
        //error_log("running domain constraint on" . $user_column . ":" . $user_field);
        if (!in_array($user_field, $this->domain)) {
            respond_bad_request(
                "Invalid value for column '$user_column'. Valid values are: " . implode(", ", $this->domain),
                ERROR_BODY_FIELD_INVALID_DATA
            );
        }
    }
}

class RestrictedContentConstraint extends Constraint {
    public Array $restricted_content;

    public function __construct(array $restricted_content) {
        $this->restricted_content = $restricted_content;
    }

    public function validate(string $user_column, $user_field) {
        //error_log("running restricted content constraint on" . $user_column . ":" . $user_field);
        
        foreach ($this->restricted_content as $restricted) {
            if (strpos($user_field, $restricted) !== false) {
                respond_bad_request(
                    "Invalid value for column '$user_column'. Cannot contain '$restricted'",
                    ERROR_BODY_FIELD_INVALID_DATA
                );
            }
        }
    }
}

class ContentLengthConstraint extends Constraint {
    public int $min;
    public int $max;

    public function __construct(int $min, int $max) {
        $this->min = $min;
        $this->max = $max;
    }

    public function validate(string $user_column, $user_field) {

        //error_log("running content length constraint on" . $user_column . ":" . $user_field);


        if (gettype($user_field) != "string") {
            respond_illegal_implementation("ContentLengthConstraint can only be used on string columns");
        }

        $len = strlen($user_field);

        if ($len < $this->min || $len > $this->max) {
            respond_bad_request(
                "Invalid length for column '$user_column'. Length must be between $this->min and $this->max",
                ERROR_BODY_FIELD_INVALID_DATA
            );
        }
    }
}


const _ASSETID = new Column("assetID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true);


const TABLE_ASSETS = new Table(
    "`ASSETS`",
    [], // no url specifiers
    [
        _ASSETID,
        new Column("ownerID", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column("assetType", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column("contentType", is_primary_key:false, type:"string", is_nullable:false, is_editable:false, is_server_generated:true),
    ],
    "asset",
    null
);




// we cant use TABLE_EMPLOYEES->get_column because function calls are not allowed in const expressions
const _EMPID = new Column("empID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true);

CONST TABLE_EMPLOYEES = new Table(
    "`EMPLOYEES`",
    ["empID"],
    [
        _EMPID,
        new Column("firstName", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false),
        new Column("lastName", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false),
        new Column("isManager", is_primary_key:false, type:"boolean", is_nullable:false, is_editable:true, is_server_generated:false),
        new Column(
            "avatar", is_primary_key:false, type:"binary", is_nullable:true, is_editable:true, is_server_generated:false,
            constraints:[new ForeignKeyConstraint(TABLE_ASSETS, _ASSETID)]
        ),
    ],
    "employee",
    null
);

const _POSTID = new Column(
    "postID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true, dont_friendly_name:true
);

const TABLE_POSTS = new Table(
    "`POSTS`",
    ["postID"],
    [
        _POSTID,
        new Column(
            "postTitle", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 128)]
        ),
        new Column(
            "postContent", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 65535)]
        ),
        new Column(
            "postAuthor", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column("postCreatedAt", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column("postIsTechnical", is_primary_key:false, type:"boolean", is_nullable:false, is_editable:true, is_server_generated:false),
    ],
    "post",
    "post"
);


const _TAGID = new Column(
    "tagID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
    dont_friendly_name:true
);

const TABLE_TAGS = new Table(
    "`TAGS`",
    ["name"],
    [
        _TAGID,
        new Column(
            "tagName", is_primary_key:true, type:"string", is_nullable:false, is_editable:false, is_server_generated:false,
            constraints:[new ContentLengthConstraint(2, 64)]
        ),
        new Column(
            "tagColour", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new RestrictedDomainConstraint(TAG_COLOURS)]
        )
    ],
    "tag",
    "tag"
);


const TABLE_POST_TAGS = new Table(
    "`POST_TAGS`",
    ["tagID"],
    [
        new Column(
            "tagID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:false,
            constraints:[new ForeignKeyConstraint(TABLE_TAGS, _TAGID)]
        ),
        new Column(
            "postID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_POSTS, _POSTID, "db_post_fetch")]
        ),
    ],
    "tags",
    null,
);


const TABLE_POST_VIEWS = new Table(
    "`POST_VIEWS`",
    [], // no url specifiers
    [
        new Column(
            "empID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column(
            "postID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_POSTS, _POSTID, "db_post_fetch")]
        ),
        new Column("postViewTime", is_primary_key:true, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
    ],
    "access",
    "postView"
);


const _PROJID = new Column("projID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true);

const TABLE_PROJECTS = new Table(
    "`PROJECTS`",
    ["projID"],
    [
        _PROJID,
        new Column("projectName", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false),
        new Column("projectDescription", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false),
        new Column(
            "projectCreatedBy", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column(
            "projectTeamLeader", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:false,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column("projectCreatedAt", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
    ],
    "project",
    "project"
);

const _TASKID = new Column(
    "taskID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true, dont_friendly_name:true
);

const TABLE_TASKS = new Table(
    "`TASKS`",
    ["projID", "taskID"],
    [
        _TASKID,
        new Column(
            "projID", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_PROJECTS, _PROJID, "db_project_fetch")]
        ),
        new Column(
            "taskCreatedBy", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column("taskTitle", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false),
        new Column("taskDescription", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false),
        new Column(
            "taskState", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new RestrictedDomainConstraint(TASK_VALID_STATES)]
        ),
        new Column("taskArchived", is_primary_key:false, type:"boolean", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column("taskCreatedAt", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column("taskDueDate", is_primary_key:false, type:"integer", is_nullable:true, is_editable:true, is_server_generated:false),
        new Column("taskExpectedManHours", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false),
    ],
    "task",
    "task"
);

const TABLE_EMPLOYEE_TASKS = new Table(
    "`EMPLOYEE_TASKS`",
    [], // no url specifiers
    [
        new Column(
            "empID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column(
            "taskID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_TASKS, _TASKID, "db_task_fetch")]
        ),
    ],
    "assignment",
    null
);

const TABLE_PERSONALS = new Table(
    "`EMPLOYEE_PERSONALS`",
    ["itemID"],
    [
        new Column("itemID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column(
            "personalAssignedTo", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column(
            "personalState", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new RestrictedDomainConstraint(TASK_VALID_STATES)]
        ),
        new Column("pesronalDueDate", is_primary_key:false, type:"integer", is_nullable:true, is_editable:true, is_server_generated:false),
        new Column(
            "personalTitle", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 254)]
        ),
        new Column(
            "personalContent", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 1024)]
        ),
    ],
    "personal",
    "personal"
);


// NOTIFICATIONS AND EVENTS


const _EVENTID = new Column("eventID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true);

const TABLE_NOTIFICATIONS = new Table(
    "`NOTIFICATIONS`",
    [],
    [
        _EVENTID,
        new Column("notificationType", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column("notificationTime", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
    ],
    "notification",
    "notification"
);

const TABLE_EMPLOYEE_POST_META = new Table(
    "`EMPLOYEE_POST_META`",
    [],
    [
        new Column(
            "empID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column(
            "postID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_POSTS, _POSTID, "db_post_fetch")]
        ),
        new Column(
            "postMetaFeedback", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false
        ),
        new Column(
            "postMetaSubscribed", is_primary_key:false, type:"boolean", is_nullable:false, is_editable:true, is_server_generated:false
        ),
    ],
    "meta",
    "postMeta"
);


const TABLE_POST_UPDATE = new Table(
    "`POST_UPDATE`",
    [],
    [
        new Column(
            "eventID", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_NOTIFICATIONS, _EVENTID)]
        ),
        new Column(
            "postUpdateEditor", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column(
            "postID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_POSTS, _POSTID, "db_post_fetch")]
        ),
    ],
    "postUpdate",
    "postUpdate"
);


const TABLE_TASK_UPDATE = new Table(
    "`TASK_UPDATE`",
    [],
    [
        new Column(
            "eventID", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_NOTIFICATIONS, _EVENTID)]
        ),
        new Column(
            "taskID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_TASKS, _TASKID, "db_task_fetch")]
        ),
        new Column("detail", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
    ],
    "taskUpdate",
    null
);

const UNION_NOTIFICATIONS = new Union(
    TABLE_NOTIFICATIONS,
    [
        NOTIFICATION_TYPE::POST_UPDATE=>TABLE_POST_UPDATE,
        NOTIFICATION_TYPE::TASK_UPDATE=>TABLE_TASK_UPDATE,
    ],
    "notificationType",
    "body"
);


?>