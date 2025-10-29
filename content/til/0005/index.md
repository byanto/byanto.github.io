+++
title = "How I Stopped Forgetting to Encode Passwords — Thanks to MapStruct"
slug = "stopped-forgetting-encode-passwords-mapstruct"
date = "2025-10-29"
description = "I used to manually call passwordEncoder.encode() in every registration flow — until I found a cleaner, safer way with MapStruct. Now password encoding happens automatically and securely by design."
summary = "I used to rely on memory to call passwordEncoder.encode() — until I made password encoding automatic with MapStruct. Now it happens safely by design."
tags = ["spring boot", "mapstruct", "security", "dto mapping", "java"]
draft = false
+++

> There’s nothing worse than realizing your “secure” app just saved a plain-text password. I learned that lesson the hard way — and `MapStruct` helped me make sure it never happens again.

### Context

While working on the user registration feature, I realized password encoding was still handled manually in the service layer. It worked, but it relied on one fragile rule: *remember to call `passwordEncoder.encode()` every single time* — a ticking time bomb if anyone forgot.

That’s not security — that’s a memory test. I wanted a system that was *secure by design*, not secure by habit.

---

### Problem

Here’s the classic pattern we’ve all written before:

```java
@Transactional
public UserResponse registerUser(RegisterRequest request) {
    User user = userMapper.toUser(request);
    user.setPassword(passwordEncoder.encode(request.password()));
    userRepository.save(user);
    return userMapper.toUserResponse(user);
}
```

This works, but it has a hidden danger: it relies on the developer always remembering to perform the encoding step. It's a procedural task that's easy to miss during a refactor or when a new developer works on the code, creating a major security vulnerability. It only takes one missed line — that encoding line — to save a plain-text password by mistake. That’s what I now call the *“Don’t Forget Pattern.”* It works until the day you forget. It depends entirely on human memory, which is never a reliable part of a system design.

---

### Solution / Explanation

The password should be encoded automatically as part of the mapping process itself, making the service layer cleaner and removing the possibility of human error. The method `userMapper.toUser(request)` should always produces a properly encoded password. `MapStruct`, the library I use for DTO-entity mapping, has a powerful and elegant pattern for this exact scenario. It involves creating a dedicated **"specialist"** component for the encoding and telling the main mapper to use it.

#### 1. Create a Specialist Component for Encoding

```java
@Component
@RequiredArgsConstructor
public class PasswordEncodingMapper {

    private final PasswordEncoder passwordEncoder;

    @EncodedMapping // custom annotation (see Step 2)
    public String encode(String raw) {
        if (raw == null) return null;
        return passwordEncoder.encode(raw);
    }
}
```

This class has only one job: handle password encoding safely. It’s like hiring a *licensed electrician* for a dangerous task — focused and reliable.

#### 2. Define a Custom Qualifier Annotation

This gives `MapStruct` a unique label to know which method to use when mapping a field.

```java
@Qualifier
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.CLASS)
public @interface EncodedMapping {}
```

It’s like adding a specific work order on the blueprint that says, “Do the electrical work here.”

#### 3. Delegate to the Specialist in the Main Mapper

```java
@Mapper(componentModel = "spring", uses = PasswordEncodingMapper.class)
public interface UserMapper {

    @Mapping(target = "roles", ignore = true)
    @Mapping(target = "password", source = "password", qualifiedBy = EncodedMapping.class)
    User toUser(RegisterRequest registerRequest);

    UserResponse toUserResponse(User user);
}
```

- `uses = PasswordEncodingMapper.class` → tells `MapStruct` to bring the specialist in.
- `qualifiedBy = EncodedMapping.class` → says *“let the specialist handle this field.”*

#### 4. How It All Works

{{< mermaid >}}

flowchart LR
    subgraph Client
      A["RegisterRequest"]
    end

    A -->|map| B["UserMapper.toUser()"]
    B -->|qualifiedBy EncodedMapping| C["PasswordEncodingMapper.encode()"]
    C -->|delegates| D["PasswordEncoder"]
    D -->|encoded password| C
    B -->|builds| E[("User Entity")]

    E -->|save| F[("UserRepository")]

{{< /mermaid >}}

This flow makes password encoding declarative and foolproof — no more manual calls scattered across the codebase.

---

### Result: A Clean and Secure Service Layer

With this pattern in place, my `UserService` is now beautifully simple and secure. It no longer knows or cares about the details of password encoding.

```java
@Transactional
public UserResponse registerUser(RegisterRequest request) {
    User user = userMapper.toUser(request); // password already encoded!
    userRepository.save(user);
    return userMapper.toUserResponse(user);
}
```

By delegating the encoding logic to a specialized component within the mapping layer, the process is now declarative, secure by design, and much more maintainable.

---

### Key Takeaways

- **Declarative security:** Password encoding happens automatically during mapping.
- **Single responsibility:** The encoding logic is handled by a small, isolated component.
- **No human error:** The system can’t forget to encode a password — because humans no longer have to.
- **Clean Architecture:** The service layer no longer deals with low-level security details.
- **Philosophy:** Don’t rely on habit for security — design your code so safety happens automatically.

---

### Reflection

This small refactor completely changed how I think about trust in code. Good security isn’t about remembering every rule — it’s about designing systems that make the right thing the easiest thing to do. By delegating password encoding to `MapStruct`, I stopped trusting myself to remember and started trusting the design itself.

It’s a simple pattern, but it embodies a bigger idea I want in every system I build:

> **“Secure by design, not by discipline.”**