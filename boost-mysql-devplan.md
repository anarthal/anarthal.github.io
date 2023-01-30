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

TODO: see implementation notes

## Feature #2: stored procedures (multi-resultset)

* You normally run a SQL query and retrieve a resultset, containing metadata, rows and some info - see [this](https://www.boost.org/doc/libs/master/libs/mysql/doc/html/mysql/overview.html#mysql.overview.resultsets).
* Configuration option to support a "multi-resultset" mode - where each operation may return several of these resultsets.
* This is used by multiple queries: useful for script sourcing:
```
    -- Running this will return two resultsets
    SELECT * FROM mytable;
    SELECT * FROM othertable;
```

* This is also used by stored procedures. Running any stored procedure that returns data requires multi-resultset support.

```sql
    -- Calling this procedure requires multi-resultset
    CREATE PROCEDURE Procedure1()
    BEGIN
        SELECT * FROM COMPANY;
    END
```

**Impact**: users can't make use of stored procedures. Users can't run batch scripts. Has been requested by real users.

**Complexities**: high and low level API, several tests, config value in handshake. My lack of knowledge of stored procedures.

## Feature #3: parsing into compile-time data structures

Currently, the only interface is variant-based: field and field_view, with semantics similar to json::value.
Clumsy. In many use cases, the schema is known at compile-time, and parsing into a struct makes things easier.
Easy to introduce customization points to parse special fields, like JSON.
Involved decisions.

High-level interface:

    struct my_row {
        int id;
        std::string first_name;
        int salary;
    };

    mysql::resultset<my_row> result;
    conn.query(“SELECT id, first_name, salary FROM employees”, result);
    boost::span<const my_row> range = result.rows();

Low-level interface:

    mysql::execution_state st;
    conn.start_query(“SELECT id, first_name, salary FROM employees”, st);
    my_row row;
    while (conn.read_one_row(st, row)) {
        // Use row
    }

Up to here: 45 man-day estimates (?)

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


Impl notes:


* The MySQL official client provides [`mysql_real_escape_string`](https://dev.mysql.com/doc/c-api/8.0/en/mysql-real-escape-string.html) to sanitize pieces of user-provided string input and allow composing safe SQL queries.
* We don't, we tell users to use prepared statements.
* There is a limitation: 


**Complexities**:
* Depends on MySQL character sets (as it needs to interpret the string), which have no representation in Boost.MySQL right now.
* Depends on server state that may change dynamically - doable but it introduces complexity.
* Security-critical - requires a heavy test suite.