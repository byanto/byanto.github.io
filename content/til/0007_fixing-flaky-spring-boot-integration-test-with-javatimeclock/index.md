+++
title = "My Spring Boot Test Kept Failing Randomly. Here’s the Simple Fix That Made It 100% Reliable."
date = 2025-11-24T10:00:00+07:00
slug = "fixing-flaky-spring-boot-integration-test-with-javatimeclock"
description = "A personal story of debugging a flaky Spring Boot test for JWT token renewal. See how I moved past anti-patterns to a professional solution using java.time.Clock, making my tests 100% reliable."
summary = "My JWT token renewal test kept failing due to a race condition. I fixed it for good by making time a controllable dependency, not with hacks like Thread.sleep()."
tags = ["Java", "Spring Boot", "Testing", "JUnit", "Mockito", "Integration Testing", "Clean Code", "Software Design"]
draft = false
+++

Let's be honest, there's a special kind of frustration that comes from a test that passes one minute and fails the next for no apparent reason. That was my world for a couple of days. I was building out the authentication flow for my Spring Boot user service, and my integration test for JWT token renewal was completely unreliable.

The test was simple enough:

1. Log in to get an access token and a refresh token.
2. Immediately use that refresh token to get a new set of tokens.
3. Assert that the new access token is different from the old one.

Sometimes it passed. Sometimes it failed, claiming the new token was identical to the old one. How was that even possible?

---

### The Mystery: A Race Against My Own Code

My first thought was, **"This is a race condition."** My test environment is fast. The `login` and `renewtoken` API calls were happening so quickly that they were executing within the same single millisecond.

I dug into my `JwtService` and found the culprit:

```java
// The old, problematic code
long nowMillis = System.currentTimeMillis();
Date now = new Date(nowMillis);
Date exp = new Date(nowMillis + expiration);
```

Both tokens were being generated with the exact same **"issued at"** (iat) timestamp. Same timestamp, same username, same roles... of course the JWT string was identical!

---

### The Wrong Turns (We've All Been There)

My first instinct? The one we all secretly try?

```java
// Don't do this!
Thread.sleep(10);
```

It worked, but it felt dirty. Using `Thread.sleep()` is a huge code smell. It slows down the entire test suite and is completely non-deterministic. It might work on my laptop, but what about a faster CI server? It's a band-aid, not a fix.

Then I noticed something weird. If I added `@Transactional` to the test, it passed consistently. For a moment, I thought I'd found a real solution. But it was a red herring. The overhead of managing the database transaction was just adding enough of a delay for the system clock to tick over. It was another accidental `sleep()`, and it was hiding the real design flaw in my code.

---

### The "Aha!" Moment: Stop Depending on the System Clock

The real problem wasn't the test; it was my service. My `JwtService` had a hidden, hard-coded dependency on the system's hardware clock. You can't control the system clock in a test, so the code was fundamentally untestable.

The professional solution, and my "aha!" moment, was to treat time as just another dependency.

**Step 1: Inject `java.time.Clock`**

I changed my services to stop calling static methods like `System.currentTimeMillis()`. Instead, they now ask for a `java.time.Clock` object in their constructor. This is a core principle of Dependency Injection.

```java
// Before: A hidden, untestable dependency
Instant now = Instant.now();

// After: An explicit, controllable dependency
@Service
@RequiredArgsConstructor
public class JwtService {
    private final Clock clock; // Injected!
    // ...
    public String generateAccessToken(...) {
        Instant now = clock.instant(); // Used here!
        // ...
    }
}
```

**Step 2: Provide the Clock for Production**

For the real application, I just need to provide the standard system clock. A simple `@Configuration` class handles this beautifully. The best part? I can enforce the best practice of always using UTC on the server.

```java
@Configuration
public class ClockConfig {
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
```

**Step 3: Take Control in the Test**

This is where it all comes together. In my integration test, I can now use `@MockitoBean` to replace the real `Clock` with a mock. I am now the master of time!

```java
@SpringBootTest(...)
public class AuthenticationFlowIntegrationTest {

    @MockitoBean
    private Clock clock;

    @Test
    void should_renewTokensSuccessfully() {
        // ...

        // 1. I decide what time it is for the login call.
        Instant loginTime = Instant.parse("2025-01-01T10:00:00Z");
        when(clock.instant()).thenReturn(loginTime);
        // ... call /login endpoint ...

        // 2. I move time forward for the renewal call.
        Instant renewalTime = loginTime.plusSeconds(10);
        when(clock.instant()).thenReturn(renewalTime);
        // ... call /renewtoken endpoint ...

        // 3. Assert the tokens are different.
        assertThat(newAccessToken).isNotEqualTo(initialAccessToken); // It passes. Every. Single. Time.
    }
}
```
---

### What I Really Learned

This wasn't just about fixing a test. It was a fundamental lesson in software design.

- **A flaky test is a symptom of a design problem.** Don't patch the test; fix the code.
- **Make your dependencies explicit.** If your code depends on the current time, that time source should be injected.
- **Write code that is testable from the start.** This forces you into better, cleaner designs.

By making this one change, I didn't just fix a flaky test. I made my application more robust, my architecture cleaner, and my entire test suite 100% reliable. And that's a win worth writing about.