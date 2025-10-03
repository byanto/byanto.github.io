+++
title = "True Integration Tests with Spring Boot and Testcontainers"
description = ""
date = "2025-10-02T23:50:10.838Z"
preview = ""
draft = true
+++

Today, I hit a big milestone in my *Fintrackr* project: writing my first real integration test for the database layer. My goal was simple: how can I be 100% sure that my JPA repositories work with a *real* PostgreSQL database, without any hassle?

I explored a few ways to do this, and learned a lot about the pros and cons of each approach.

### Option 1: The Simulator (An In-Memory H2 Database)

The first common approach is to use an in-memory database like H2. Spring Boot makes this very easy. We add the H2 dependency, and Spring Boot will automatically configure our tests to run against this fast, temporary database.

* **The Problem:** H2 is **not** PostgreSQL. While it speaks SQL, it has different data types, function names, and behaviors. A query that works on H2 might fail on our real PostgreSQL production database.
* **The Analogy:** It's like practicing for a Formula 1 race in a high-end go-kart. We're driving, we're learning the basics, but it's not the real car. We might be in for a surprise on race day.

### Option 2: The Shared Kitchen (A Manual Test Database)

The next option is to set up a separate, permanent PostgreSQL database just for testing. This is better, since we're testing against the real technology.

* **The Problem:** This approach is a maintenance nightmare. The database isn't clean for every test run, so data from a previous test can cause our current test to fail. Every developer has to manually install and manage this database, and it's hard to keep it consistent with teammates and the CI/CD server.
* **The Analogy:** This is like a group of chefs sharing one kitchen. If one chef leaves a mess (dirty data), the next chef's dish (the next test) is ruined. It's slow, unreliable, and requires constant cleanup.

### Option 3 (The Solution): The Private, Disposable Kitchen (Testcontainers)

This is the modern, professional solution that solves all the problems above. Testcontainers is a library that programmatically starts (and stops) a real Docker container for our tests.

* **The Benefit:** We get a **brand-new, perfectly clean, real** PostgreSQL database for every single test run. When the test is over, the database is automatically destroyed. No manual setup, no cleanup, no interference.
* **The Analogy:** It's like giving every chef their own private, brand-new, perfectly clean kitchen for every dish they cook. When they're done, the entire kitchen is thrown away. It guarantees a perfect start, every time.

### The "Magic" Explained: What `@Container` and `@ServiceConnection` Replace

The combination of `@Container` and `@ServiceConnection` is a modern and highly effective way to set up integration tests in Spring Boot that require external services, like a database.
So how does it work? These two annotations replace a lot of manual work.

**`@Container`**

This annotation comes from the **Testcontainers** library. Its job is to manage the lifecycle of a Docker container for our tests.
* **What it does**: It marks the *PostgreSQLContainer* field as a resource that should be managed by the Testcontainers JUnit 5 extension (which is enabled by *@Testcontainers* annotation at the class level).
* **Lifecycle Management**: Testcontainers will automatically:
1. Start the *postgres* Docker container before any tests in this class are run.
2. Stop and remove the container after all tests in the class have finished.
* **Static Field**: The *postgres* container is declared as *static*. This is a common optimization. It means a single container is started once for all test methods in the *Test* class, rather than starting a new container for each test. This significantly speeds up our test suite.

**`@Container` replaces the need to manually:**
1.  Install PostgreSQL on our machine.
2.  Start the database server before we run our tests.
3.  Create a specific user and password for testing.
4.  Stop the database server after we're done.

**`@ServiceConnection`**

This annotation is a game-changer introduced in **Spring Boot 3.1**. It dramatically simplifies connecting our test's ApplicationContext to the service running in the Testcontainer.

* **What it does**: It tells Spring Boot to automatically inspect the container (in this case, a *PostgreSQLContainer*) and configure the necessary connection properties for us.
* **Automatic Configuration**: Without any manual effort, Spring Boot will:
1. Wait for the container to be ready.
2. Get the dynamic JDBC URL, username, and password from the running *PostgreSQLContainer*.
3. Set the *spring.datasource.url*, *spring.datasource.username*, and *spring.datasource.password* properties for the test environment.

**`@ServiceConnection` replaces the need to manually:**
1.  Create a separate test configuration file (like `application-test.properties`).
2.  Find the random port that Docker assigned to our test database container.
3.  Manually override our Spring Boot properties (`spring.datasource.url`, `username`, `password`) to point to that specific, temporary database.

**How They Work Together**
1. *@Testcontainers* activates the Testcontainers extension.
2. *@Container* starts the PostgreSQLContainer instance.
3. *@ServiceConnection* sees the running container and automatically wires up the Spring DataSource to connect to it.
4. *@DataJpaTest* then uses this container-backed DataSource to run our repository tests against a real PostgreSQL database.

This combination replaces the older, more verbose pattern to manually map the container's properties to Spring's properties. It's cleaner, less error-prone, and more declarative.

### The Code ###

First, the necessary dependencies for *Testcontainers* and *PostgreSQL* must be added to the `pom.xml` file:
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

Then, setting up the test class was incredibly clean:

```java
@Testcontainers // 1. Enable the Testcontainers extension
@DataJpaTest // 2. Set up a JPA test environment
// 3. Tell Spring not to replace the application's configured DataSource (the real database)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) 
class PortfolioRepositoryTest {

    @Container // 4. Define the container to be used for all tests in this class
    @ServiceConnection // 5. The magic! Automatically connects Spring to this container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired 
    private PortfolioRepository portfolioRepository;

    // ... test methods
}
```

### The Takeaway ###
I learned that writing high-fidelity integration tests doesn't have to be complicated. With *Testcontainers* and *Spring Boot*, we can run our tests against a real, disposable PostgreSQL database every single time, which gives us huge confidence that our code is correct and well tested.