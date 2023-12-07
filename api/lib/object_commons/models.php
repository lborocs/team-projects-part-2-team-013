<?php
// generic tables

const TASK_STATE_TODO = 0;
const TASK_STATE_INPROGRESS = 1;
const TASK_STATE_COMPLETED = 2;

const TASK_VALID_STATES = [TASK_STATE_TODO, TASK_STATE_INPROGRESS, TASK_STATE_COMPLETED];

const TAG_COLOURS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];


// THIS MIGHT JUST BE JAVA
// if it was java maybe i would make a not null constraint
// and enums


class Table {
    public string $name;
    private Array $url_specifiers;
    public Array $columns;
    public string $friendly_name;

    public function __construct(string $name, Array $url_specifiers, Array $columns, string $friendly_name) {
        $this->name = $name;
        $this->url_specifiers = $url_specifiers;
        $this->friendly_name = $friendly_name;
        $this->columns = $columns;
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
    public Table $parent;

    public function __construct(
        string $name,
        bool $is_primary_key,
        string $type,
        bool $is_nullable,
        bool $is_editable,
        bool $is_server_generated,
        array $constraints = []
    ) {
        $this->name = $name;
        $this->is_primary_key = $is_primary_key;
        $this->type = $type;
        $this->is_nullable = $is_nullable;
        $this->is_editable = $is_editable;
        $this->is_server_generated = $is_server_generated;
        $this->constraints = $constraints;
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
        error_log("running domain constraint on" . $user_column . ":" . $user_field);
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
        new Column("type", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column("contentType", is_primary_key:false, type:"string", is_nullable:false, is_editable:false, is_server_generated:true),
    ],
    "asset"
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
    "employee"
);

const _POSTID = new Column("postID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true);

const TABLE_POSTS = new Table(
    "`POSTS`",
    ["postID"],
    [
        _POSTID,
        new Column(
            "title", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 128)]
        ),
        new Column(
            "content", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 65535)]
        ),
        new Column(
            "createdBy", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column("createdAt", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column("isTechnical", is_primary_key:false, type:"boolean", is_nullable:false, is_editable:true, is_server_generated:false),
    ],
    "post"
);


const _TAGID = new Column("tagID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true);

const TABLE_TAGS = new Table(
    "`TAGS`",
    ["name"],
    [
        _TAGID,
        new Column(
            "name", is_primary_key:true, type:"string", is_nullable:false, is_editable:false, is_server_generated:false,
            constraints:[new ContentLengthConstraint(2, 64)]
        ),
        new Column(
            "colour", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new RestrictedDomainConstraint(TAG_COLOURS)]
        )
    ],
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
        new Column(
            "colour", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new RestrictedDomainConstraint(TAG_COLOURS)]
        ),
    ],
    "tags"
);


const TABLE_FORUM_ACCESSES = new Table(
    "`FORUM_ACCESSES`",
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
        new Column("timeAccessed", is_primary_key:true, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
    ],
    "access"
);


const _PROJID = new Column("projID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true);

const TABLE_PROJECTS = new Table(
    "`PROJECTS`",
    ["projID"],
    [
        _PROJID,
        new Column("projName", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false),
        new Column("description", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false),
        new Column(
            "createdBy", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column(
            "teamLeader", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:false,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column("createdAt", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
    ],
    "project"
);

const _TASKID = new Column("taskID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true);

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
            "createdBy", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column("title", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false),
        new Column("description", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false),
        new Column(
            "state", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new RestrictedDomainConstraint(TASK_VALID_STATES)]
        ),
        new Column("archived", is_primary_key:false, type:"boolean", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column("createdAt", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column("dueDate", is_primary_key:false, type:"integer", is_nullable:true, is_editable:true, is_server_generated:false),
        new Column("expectedManHours", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false),
    ],
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
    "assignment"
);

const TABLE_PERSONALS = new Table(
    "`EMPLOYEE_PERSONALS`",
    ["itemID"],
    [
        new Column("itemID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true),
        new Column(
            "assignedTo", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new Column(
            "state", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new RestrictedDomainConstraint(TASK_VALID_STATES)]
        ),
        new Column("dueDate", is_primary_key:false, type:"integer", is_nullable:true, is_editable:true, is_server_generated:false),
        new Column(
            "title", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 254)]
        ),
        new Column(
            "content", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 1024)]
        ),
    ],
    "personal"
);

?>