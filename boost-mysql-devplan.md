# Development Plan for Boost.MySQL

## Background

Boost.MySQL is a MySQL client based on Boost.Asio. It is part of the "*cloud-native, Asio-based ecosystem for C++*" that we are creating.

As of today (30-01-2023) Boost.MySQL has been accepted into Boost and has been significantly improved since the review. It will have its first stable release with Boost 1.82.

Some of the key library goals are:
* Fully **interoperable with the Asio ecosystem**.
* **Efficient** and base for further abstraction. This implies that we could not use the official MySQL client libraries. Boost.MySQL **fully implements** MySQL client/server **wire protocol**.
* Matches in functionality with other official MySQL client libraries, like `libmysqlclient`.

## So what are we missing?

There is **a lot** of work yet to be done in Boost.MySQL. Roughly speaking, there are three ways to make the library more attractive to users:

1. Implement more **protocol features**. With the current protocol support level, our users can't use [stored procedures](https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html), [batch scripts](https://dev.mysql.com/doc/c-api/8.0/en/c-api-multiple-queries.html) or [client-side composed queries](https://dev.mysql.com/doc/c-api/8.0/en/mysql-real-escape-string.html), to name a few. There is **no workaround** for these limitations: if you need these features, you need to stop using Boost.MySQL.
2. Improve the overall **security** of the library, with fuzzing, internal buffer size maximums...
3. Implement **additional features** that can make the library easier to use, like parsing into user-defined structs or connection pooling.

It's also important to understand what we're **not** trying to achieve:

1. We're not an ORM. We won't be implementing features like DDL and DML statement generation.
2. Boost.MySQL is and will be specific to MySQL/MariaDB. It won't attempt to be compatible with other SQL databases. We believe in the principle of *do one thing and do it well*.

The rest of the document presents the most prioritary features as the author understands them.

## Feature #1: client-side composed queries (escaping user-provided input)

When using user-provided input in SQL queries, it must be properly sanitized to avoid SQL injection attacks. There are two approaches for doing this (pseudocode follows):

```cpp
    // Option 1: use a prepared statement and let the server take care of it
    conn.prepare_statement("SELECT * FROM users WHERE name = ?").execute(user_name);

    // Option 2: create the query client-side. Requires a escaping routine
    string sql = "SELECT * FROM users WHERE name = '" + escape_sql(user_name) + "'";
    conn.query(sql);
```

Option 1 is the safest and most used, and is fully supported. However, some use cases require using option 2:

```cpp
    // Option 1 doesn't work here: can't use placeholders for SQL identifiers
    conn.prepare_statement("SELECT * FROM ? LIMIT 200").execute(table_name);

    // Option 2 is the only option here. Right now, we're missing the escape_sql function
    string sql = "SELECT * FROM `" + escape_sql(table_name) + "` LIMIT 200";
    conn.query(sql);
```

**Impact**:
* Some use cases, like exporting tables in ETL processes or executing generated DDL statements, can't be achieved.
* Users may roll their own `escape_sql`, which almost always leads to security problems.

As with everything with MySQL, it's much more involved than it looks like, as proper escaping depends on character sets and server statuses.

Please read the implementation notes at the bottom of this document for technical details.

## Feature #2: stored procedures and batch scripts (multi-resultset)

In the most common case, when you run a SQL statement, you get a single table-like response, called a [*resultset*](https://www.boost.org/doc/libs/master/libs/mysql/doc/html/mysql/overview.html#mysql.overview.resultsets):

```cpp
    mysql::resultset result; // Will hold all rows in the users table
    conn.query("SELECT * FROM users", result);
```

The protocol allows running multiple statements in a go, which returns multiple resultsets. This is common in **batch scripts**. We don't have support for this yet, though:

```cpp
    // This will result in an error: multi-resultset is not yet supported
    string sql = "SELECT * FROM users; SELECT * FROM companies";
    conn.query(sql, result);
```

The same mechanism is used for stored procedures that retrieve any data. Given this procedure definition:

```sql
    CREATE PROCEDURE Procedure1()
    BEGIN
        SELECT * FROM companies;
    END
```

Calling it using Boost.MySQL fails because of the lack of support for this protocol feature.

**Impact**:
* Users can't make use of stored procedures, which has been already raised by a real user.
* Users can't run batch scripts.

Please read the implementation notes at the bottom of this document for technical details.

## Feature #3: parsing into compile-time data structures

To access data retrieved from MySQL, we currently support a variant-like interface, only. It's based on [`field_view`](https://www.boost.org/doc/libs/master/libs/mysql/doc/html/mysql/ref/boost__mysql__field_view.html), similar to `json::value`.
It does the work, but it can be clumsy.

In many use cases, the schema is known at compile-time, and parsing into a struct makes things easier. It's also easy to introduce customization points to parse special fields, like JSON.

This is what it could look like:

```cpp
    struct employee {
        std::string first_name;
        int salary;
    };

    // With variants
    mysql::resultset v_result;
    conn.query("SELECT first_name, salary FROM employees", v_result);
    string_view first_name = v_result.at(0).at(0).as_string();

    // With structs
    mysql::basic_resultset<employee> result;
    conn.query("SELECT first_name, salary FROM employees", result);
    string_view first_name = result.at(0).first_name;
```

**Impact**:
* The library is more attractive to new potential users.
* Using the library is less error-prone, which yields better safety and security.

Please read the implementation notes at the bottom of this document for technical details.

## Further features
* [Security] Allow the user to specify max internal sizes for buffers (prevent DoS).
* [Security] Fuzzing & sanitizers.
* [Protocol] Allow unknown default authentication plugins.
* [Protocol] Statement fetch: allow using client-side cursors.
* [Protocol] `LOAD DATA LOCAL INFILE`: high-speed loading for ETL processes.
* [Protocol] Multi-factor authentication
* [Protocol/Library] Pipeline mode.
* [Protocol] Compression.
* [Library] Optimizing build times: type-erasing and separate-build mode.
* [Library] Connection pooling.
* [Library] Creating connections from URL strings.
* [Library] Docs improvements: comparisons, benchmarks...

## Implementation notes

### Escaping user-provided input

* The MySQL official client provides [`mysql_real_escape_string`](https://dev.mysql.com/doc/c-api/8.0/en/mysql-real-escape-string.html) to sanitize pieces of user-provided string input and allow composing safe SQL queries.
* Escaping requires understanding the query string, to some extent, and that requires some level of support for MySQL character sets. The official implementation uses `my_ismbchar` and `my_mbcharlen_ptr` to iterate over the string. Blind escaping leads to vulnerabilities. We need to make a decision on what charsets to support.
* Escaping depends on [`NO_BACKSLASH_ESCAPES`](https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_no_backslash_escapes) SQL mode being active or not, which can be changed using SQL. The correct approach here is to use information contained in the OK packets sent by the server to maintain state about whether this is active or not.
* Escaping depends on the quoting context the string is being used on - depending on the use, strings can be backtick enclosed, single quoted or double quoted.
* This is a security critical function and requires heavy testing.

### Multi-resultset

* The same feature is used for multi-queries, stored procedures selecting data, and stored procedures with `OUT` parameters. Although they share implementation, they will require separate testing and some specialized API functions - there are design decision to be made here.
* Ideally, support for multi-queries should be disabled by default, as it is a more secure default. An investigation needs to be conducted on whether this is possible.

### Parsing into compile-time data structures

* There are a lot of design decisions to be made. I plan to open a public discussion on the ML/GitHub to gather feedback.
* Proper diagnostics should be taken into account to make using the library easier. Schema mismatches should be reported as early and clearly as possible.
* The high-level API (as shown in this document) should be complemented with typed versions of low level functions like `read_one_row` and `read_some_rows`. These should also allow for using views for strings and blobs.
* The high-level API can get more complex if we intend it to support multi-resultset in a type-safe manner.
* The statement execution interface should also be enhanced to be consistent with whatever we support during parsing.
* Some degree of type-erasing will be required in the implementation to avoid code bloat, which is probably already happening with statement execution.
* We can support `std::tuple`s and Boost.Describe structs out of the box. We might want to also consider Boost.Pfr, or adding a second customisation point at the type level.
