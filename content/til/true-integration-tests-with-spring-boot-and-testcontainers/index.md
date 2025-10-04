+++
title = "True Integration Tests with Spring Boot and Testcontainers"
slug = "integration-tests-spring-boot-testcontainers"
date = "2025-10-02T23:50:10.838Z"
tag = ["spring boot", "testing", "testcontainers", "datajpatest", "java"]
draft = true
+++

### Context

In my last TIL, I explored how `@DataJpaTest` helps simplify repository testing in Spring Boot. That approach was a huge improvement compared to running the full application context — it gave me lightweight, focused tests for my JPA repositories.

But `@DataJpaTest` usually defaults to an in-memory H2 database, which isn’t always a perfect mirror of my production database (PostgreSQL). That works for quick feedback, but deep down, I didn’t feel comfortable. If I want to trust my backend logic, I need to see my queries working against a real PostgreSQL instance, not a simulator. A query that works on H2 might fail on a real PostgreSQL production database.

That’s what led me to my next step: `Testcontainers`.

If `@DataJpaTest` is about making repository tests fast and isolated, then `Testcontainers` is about making them realistic and trustworthy. Together, they form a natural progression:
- Step 1: Use `@DataJpaTest` for quick, slice-level testing.
- Step 2: Add `Testcontainers` when you want to validate your repositories against the actual database technology.

### Problem

With `@DataJpaTest`, I felt confident in my repository logic — but I also knew there was a gap. H2 isn’t PostgreSQL. Subtle differences in data types, SQL functions, and query behavior could still trip me up.

The first idea that comes to my mind was to run a dedicated PostgreSQL database for tests. This is more realistic since it’s the same tech as production. The problem was that it’s messy. Developers must install PostgreSQL locally, keep it running, and manage test data. The database isn’t automatically cleaned between runs, which leads to flaky tests.

This option was not good enough. What I wanted is following:
- Realism (PostgreSQL, not H2).
- Isolation (a clean DB every run).
- Automation (no manual setup).

### Solution

**How `Testcontainers` Fits with `@DataJpaTest`**

- `@DataJpaTest` keeps the scope small: just repositories, entities, and JPA.
- `Testcontainers` replaces H2 with a real PostgreSQL instance in Docker.
- Together, they give me focused tests with production-like reliability.

This combo means I don’t have to choose between speed and realism — I can get both.

**The "Magic" Explained: `@Container` and `@ServiceConnection`**

Spring Boot 3.1+ makes `Testcontainers` integration almost effortless. Two annotations do most of the heavy lifting:

**`@Container` (from `Testcontainers`)**

Marks a container (e.g., PostgreSQLContainer) to be managed by JUnit.
- Lifecycle: Starts before tests, stops afterward.
- Optimization: Declared as static so it runs once per test class, not per test method.
- What it replaces: Manually installing PostgreSQL, starting/stopping it, and setting up users.

**`@ServiceConnection` (from Spring Boot)**

Introduced in Spring Boot 3.1, this automatically wires Spring Boot’s datasource properties (spring.datasource.url, username, password) from the running container.
- What it replaces: Writing an application-test.properties file, looking up random Docker ports, and manually overriding Spring properties.
- How it helps: Spring just “knows” how to connect to the container.

Together, these annotations mean no more boilerplate. Spring + Testcontainers handle everything: start the DB, configure connection properties, and clean up after.

**Code Example**

Dependencies in pom.xml:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

Test class:

```java
@Testcontainers // Enable Testcontainers extension
@DataJpaTest // Set up a JPA test environment
// Tell Spring not to replace the application's configured DataSource (the real database)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PortfolioRepositoryTest {

    @Container // Managed PostgreSQL container
    @ServiceConnection // Spring Boot auto-wires datasource from this container
    static PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired
    private PortfolioRepository portfolioRepository;

    // ... test methods
}
```

Notice how the test looks almost identical to the H2-based `@DataJpaTest` version. The only difference is now it’s running against a real PostgreSQL container. Look at how simple it is: no manual configs, no extra property files. That’s the beauty of this approach: minimal changes, maximum realism.

**How It All Fits Together**
1. `@Testcontainers` activates container lifecycle management.
2. `@Container` defines the PostgreSQL instance.
3. `@ServiceConnection` hands over the connection details to Spring Boot automatically.
4. `@DataJpaTest` ensures only repository-related beans are loaded.
5. Each test runs against a fresh, real PostgreSQL database.

### Key Takeaway ###

- H2 is fast, but not realistic enough for production-grade testing.
- A manually set up PostgreSQL test database leads to messy, flaky tests.
- `Testcontainers` provides a clean, disposable, real PostgreSQL instance per run.
- `@ServiceConnection` makes integration nearly effortless.
- Writing true integration tests can actually be clean and enjoyable.

### Reflection ###

Looking back, I’m glad I first learned `@DataJpaTest`. It gave me a foundation: testing repositories in isolation without the noise of the whole Spring Boot context.

But adding `Testcontainers` feels like the natural "level-up". It answers the question I had after the first post: *"What if my query passes on H2 but fails on Postgres?"* Now I don’t have to wonder.

In a project like *Fintrackr*, where correctness of financial data matters, that’s priceless. Accuracy in repository queries isn’t just nice to have — it’s mission-critical. And now I can test it with confidence.