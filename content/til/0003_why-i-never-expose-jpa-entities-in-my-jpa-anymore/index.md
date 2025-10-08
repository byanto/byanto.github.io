+++
title = "Why I Never Expose JPA Entities in My APIs Anymore"
slug = "why-never-expose-jpa-entities"
date = "2025-10-07T10:50:10+07:00"
description = "How I learned that using DTOs instead of JPA entities keeps APIs safe, clean, and decoupled from the database."
summary = "Why exposing entities directly is risky and how DTOs protect your API design."
tags = ["spring boot", "testing", "dto", "architecture", "best practices", "java"]
draft = false
+++

### Context

While working on `Fintrackr`, I reached the point where my backend needed to return JSON responses from the database. I had my entities — `Transaction`, `Portfolio`, and `Stock` — ready to go, and it was tempting to just return them directly from the controller.

But as I started to think about API design, I realized this approach could easily backfire. I kept seeing the same advice in blogs and code reviews:

> “Don’t expose your JPA entities directly — use DTOs.”

At first, it felt unnecessary. Why introduce another layer when I could just return what’s already there? But once I understood the **why**, it made total sense.

---

### Problem

Using JPA entities directly in APIs tightly couples your internal database model to your external API contract. That sounds harmless until you start making changes — or until sensitive data slips through by accident.

It’s one of those invisible problems that doesn’t hurt until it suddenly does.

Let’s break it down.

#### 1. Security Risks
JPA entities are direct mirrors of your database tables. They often include fields that you’d never want to expose publicly — but returning entities directly makes that mistake easy.

**Example:**

Imagine a `User` entity like this:

```java
@Entity
public class User {
    private Long id;
    private String username;
    private String passwordHash;
}

```

If your controller returns the `User` entity directly:

```java
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return userRepository.findById(id).orElseThrow();
}

```

Your API response will include the `passwordHash` field by default. Even though it’s hashed, you’ve just leaked something that should never leave your backend.

A `UserDTO`, on the other hand, defines only the safe data:

```java
public record UserDTO(Long id, String username) {}
```

and you return that instead:

```java
@GetMapping("/users/{id}")
public UserDTO getUser(@PathVariable Long id) {
    User user = userRepository.findById(id).orElseThrow();
    return new UserDTO(user.getId(), user.getUsername());
}
```

The DTO acts as a **protective barrier**, making sure only intentional data crosses the boundary.

#### 2. Maintenance and Flexibility

Your database schema and your API will evolve in different ways:
- Your **database** changes based on internal design choices.
- Your **API** changes based on what frontend clients need.

When you expose entities directly, those two layers become inseparable and that’s dangerous.

**Example:**

Suppose you rename `Portfolio.name` to `Portfolio.portfolioName`.
If you’ve been returning the entity directly, every frontend consuming `/api/portfolios` will break overnight.

With a `DTO`, though, your external API stays stable:

```java
public record PortfolioResponse(Long id, String name) {
    public static PortfolioResponse fromEntity(Portfolio portfolio) {
        return new PortfolioResponse(portfolio.getId(), portfolio.getPortfolioName());
    }
}
```

Now you can safely refactor your database schema without touching client code, just adjust the mapping logic once.

DTOs give your backend freedom to evolve internally while keeping your API stable externally.

#### 3. Different Data Shapes

Real-world APIs rarely map one-to-one with database tables.
For example, Fintrackr’s frontend might need a combined view of portfolio data and its total market value — something that doesn’t exist as a single entity.

That’s where DTOs shine. You can easily build composite responses:

```java
public record PortfolioSummaryDTO(
    String portfolioName,
    BigDecimal totalValue,
    int stockCount
) {}
```

DTOs let you shape data for specific use cases without polluting your domain model.

---

### Analogy: The Restaurant Menu vs. The Kitchen Recipe

I like to think of it this way:
- **Entity = Kitchen Recipe**  
  Full of details, measurements, and internal steps only the chefs (backend) need.

- **DTO = Restaurant Menu**  
  Clean, simple, and only shows what the customer (frontend) should see.

You’d never hand your customers a messy kitchen recipe with all your secrets, just like you shouldn’t expose your JPA entities directly through a public API.

---

### Visualization: How data moves between layers

The diagram below shows how data moves between layers in a typical Spring Boot backend. It highlights how DTOs act as the translator between internal entities and external API responses.

{{< mermaid >}}

flowchart LR
    %% ====== LAYERS ======
    subgraph CLIENT["Client Layer"]
        U["Client / Frontend"]
    end

    subgraph CONTROLLER["Controller Layer"]
        C["Spring REST Controller"]
    end

    subgraph SERVICE["Service Layer"]
        S["Service Class"]
    end

    subgraph DATA["Data Layer"]
        E[("JPA Entity")]
        R["Repository"]
    end

    %% ====== DATA FLOW ======
    U -->|"HTTP Request (JSON DTO)"| C
    C -->|"Calls Service with DTO Request"| S
    S -->|"Uses Repository to fetch/store Entities"| R
    R -->|"Returns Entity objects"| S
    S -->|"Returns DTO Response"| C
    C -->|"HTTP Response (JSON DTO)"| U

    %% Mapping indicator
    S <-.->|"Maps DTO ↔ Entity"| D["DTO <--> Entity Mapper"]

    %% ====== STYLE (Adaptive to theme) ======
    %% These colors work well in both modes
    classDef client fill:#cfe2ff,stroke:#6ea8fe,color:#052c65;
    classDef controller fill:#d1e7dd,stroke:#75b798,color:#0f5132;
    classDef service fill:#fff3cd,stroke:#ffecb5,color:#664d03;
    classDef data fill:#f8d7da,stroke:#f5c2c7,color:#58151c;
    classDef mapper fill:#fff9c4,stroke:#fdd835,color:#7a5e00;

    class U client;
    class C controller;
    class S service;
    class R data;
    class E data;
    class D mapper;

{{< /mermaid >}}
*Figure 1: The flow of data through the layers — the Service acts as the bridge between Entity and DTO, ensuring the Controller and Client never touch Entities directly.*

---

### Key Takeaways
- JPA entities mirror your internal database, they’re not meant to be public.
- DTOs protect sensitive data and define a clear, stable API contract.
- They allow your database schema to evolve without breaking clients.
- You can tailor DTOs to match frontend needs, not database tables.
- Think of DTOs as your “menu” and entities as your “kitchen recipes.”

---

### Reflection

This concept clicked for me while building Fintrackr’s first API endpoints. It felt redundant at first, but once I saw how DTOs keep my code flexible and secure, it became a no-brainer.

As my project grows — more modules, more endpoints, more data — this separation will pay off massively. DTOs aren’t just a best practice; they’re an investment in **maintainability** and **safety**.

In hindsight, this was a turning point for me: moving from **“just making things work”** to thinking like an engineer who designs for the future.