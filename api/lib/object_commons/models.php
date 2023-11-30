<?php
// generic tables

const OBJECT_SNOWFLAKE_VALIDITY_FUNCTIONS = [
    "EMP"=>"db_employee_fetch",
];

const TASK_STATE_TODO = 0;
const TASK_STATE_INPROGRESS = 1;
const TASK_STATE_COMPLETED = 3;

const TASK_VALID_STATES = [TASK_STATE_TODO, TASK_STATE_INPROGRESS, TASK_STATE_COMPLETED];


// THIS MIGHT JUST BE JAVA
// if it was java maybe i would make a not null constraint
// and enums


class Table {
    public string $name;
    private Array $url_specifiers;
    public Array $columns;

    public function __construct(string $name, Array $url_specifiers, Array $columns) {
        $this->name = $name;
        $this->url_specifiers = $url_specifiers;
        $this->columns = $columns;
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

class TableColumn {
    public bool $is_primary_key;
    public string $name;
    public string $type;
    public bool $is_nullable;
    public bool $is_editable;
    public bool $is_server_generated;
    public array $constraints;

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
}

abstract class Constraint {
    public abstract function validate(string $user_column, $user_field);
}

class ForeignKeyConstraint extends Constraint {
    public Table $foreign_table;
    public TableColumn $foreign_column;
    public $validity_function;

    public function __construct(Table $foreign_table, TableColumn $foreign_column, callable $validity_function) {
        $this->foreign_table = $foreign_table;
        $this->foreign_column = $foreign_column;

        if (!is_callable($validity_function)) {
            respond_illegal_implementation("validity function is not callable");
        }

        $this->validity_function = $validity_function;
    }

    public function validate(string $user_column, $user_field) {

        error_log("running foreign key constraint on" . $user_column . ":" . $user_field);

        $func = $this->validity_function;

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

class ContentLengthConstraint extends Constraint {
    public int $min;
    public int $max;

    public function __construct(int $min, int $max) {
        $this->min = $min;
        $this->max = $max;
    }

    public function validate(string $user_column, $user_field) {

        error_log("running content length constraint on" . $user_column . ":" . $user_field);


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

// we cant use TABLE_EMPLOYEES->get_column because function calls are not allowed in const expressions
const _EMPID = new TableColumn("empID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true);

CONST TABLE_EMPLOYEES = new Table(
    "`EMPLOYEES`",
    ["empID"],
    [
        _EMPID,
        new TableColumn("firstName", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false),
        new TableColumn("lastName", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false),
        new TableColumn("isManager", is_primary_key:false, type:"boolean", is_nullable:false, is_editable:true, is_server_generated:false),
    ]
);

const TABLE_POSTS = new Table(
    "`POSTS`",
    ["postID"],
    [
        new TableColumn("postID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true),
        new TableColumn(
            "title", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 128)]
        ),
        new TableColumn(
            "content", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 65535)]
        ),
        new TableColumn(
            "createdBy", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new TableColumn("createdAt", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
        new TableColumn("isTechnical", is_primary_key:false, type:"boolean", is_nullable:false, is_editable:true, is_server_generated:false),
    ]
);

const _PROJID = new TableColumn("projID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true);

const TABLE_PROJECTS = new Table(
    "`PROJECTS`",
    ["projID"],
    [
        _PROJID,
        new TableColumn("projName", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false),
        new TableColumn("description", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false),
        new TableColumn(
            "createdBy", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new TableColumn(
            "teamLeader", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:false,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new TableColumn("createdAt", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),

    ]
);

const TABLE_TASKS = new Table(
    "`TASKS`",
    ["projID", "taskID"],
    [
        new TableColumn("taskID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true),
        new TableColumn(
            "projID", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_PROJECTS, _PROJID, "db_project_fetch")]
        ),
        new TableColumn(
            "createdBy", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new TableColumn("title", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false),
        new TableColumn("description", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false),
        new TableColumn(
            "state", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new RestrictedDomainConstraint(TASK_VALID_STATES)]
        ),
        new TableColumn("archived", is_primary_key:false, type:"boolean", is_nullable:false, is_editable:false, is_server_generated:true),
        new TableColumn("createdAt", is_primary_key:false, type:"integer", is_nullable:false, is_editable:false, is_server_generated:true),
        new TableColumn("dueDate", is_primary_key:false, type:"integer", is_nullable:true, is_editable:true, is_server_generated:false),
        new TableColumn("expectedManHours", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false),
    ]
);

const TABLE_PERSONALS = new Table(
    "`EMPLOYEE_PERSONALS`",
    ["itemID"],
    [
        new TableColumn("itemID", is_primary_key:true, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true),
        new TableColumn(
            "assignedTo", is_primary_key:false, type:"binary", is_nullable:false, is_editable:false, is_server_generated:true,
            constraints:[new ForeignKeyConstraint(TABLE_EMPLOYEES, _EMPID, "db_employee_fetch")]
        ),
        new TableColumn(
            "state", is_primary_key:false, type:"integer", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new RestrictedDomainConstraint(TASK_VALID_STATES)]
        ),
        new TableColumn("dueDate", is_primary_key:false, type:"integer", is_nullable:true, is_editable:true, is_server_generated:false),
        new TableColumn(
            "title", is_primary_key:false, type:"string", is_nullable:false, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 254)]
        ),
        new TableColumn(
            "content", is_primary_key:false, type:"string", is_nullable:true, is_editable:true, is_server_generated:false,
            constraints:[new ContentLengthConstraint(4, 1024)]
        ),

    ]
);

?>