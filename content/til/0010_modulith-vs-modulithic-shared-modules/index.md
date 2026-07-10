---
title: "Spring Modulith: @Modulith or @Modulithic, and Does It Matter"
slug: "spring-modulith-modulith-vs-modulithic-shared-modules"
date: 2026-07-01
draft: false
description: "The difference between Spring Modulith's @Modulith and @Modulithic annotations, why neither is deprecated, and how sharedModules differs from an OPEN module for a shared kernel."
summary: "I could not tell whether to annotate my app with @Modulith or @Modulithic, so I opened the jar and read the bytecode. Here is what I found, and how I ended up declaring my shared kernel."
tags: ["spring-modulith", "spring-boot", "java", "modular-monolith", "architecture"]
---

I am building a modular monolith with Spring Modulith. Three business modules and one `shared` kernel holding the value objects and identifiers that more than one module needs. Money, an asset id, a broker account id. Standard shared-kernel stuff.

Then I hit a small question that ate more time than it should have. Which annotation goes on my application class, `@Modulith` or `@Modulithic`? Both exist. Both compile. The tutorials use them almost interchangeably and nobody says why.

So I stopped guessing and opened the jar.

## Reading the annotations instead of the blog posts

`@Modulithic` is the base annotation. It carries the configuration Spring Modulith cares about: which packages are modules, which ones are shared, system name, and so on.

`@Modulith` is a convenience. Inside the jar it is composed of two things:

```java
@SpringBootApplication
@Modulithic
public @interface Modulith {
    // attributes here are @AliasFor the ones on @Modulithic
}
```

That was the piece I was missing. `@Modulith` is `@SpringBootApplication` plus `@Modulithic` fused into one annotation, with its attributes wired through with `@AliasFor` so anything you can set on `@Modulithic` you can also set on `@Modulith`. Neither is deprecated. They are two doors into the same room.

So the practical rule is boring:

- Use `@Modulith` and you can delete `@SpringBootApplication`, because it is already inside.
- Use `@Modulithic` and you keep `@SpringBootApplication` next to it.

Same result either way. I went with `@SpringBootApplication` plus `@Modulithic` because I like seeing the Spring Boot entry point spelled out on the class. That is a taste call, not a correctness one. If you prefer one line, `@Modulith` is the one line.

```java
@SpringBootApplication
@Modulithic(sharedModules = "shared")
public class FintrackrApplication {
    public static void main(String[] args) {
        SpringApplication.run(FintrackrApplication.class, args);
    }
}
```

## The question that actually mattered: how to declare the shared kernel

The annotation choice was a distraction. The real decision was how to tell Spring Modulith that every module is allowed to depend on `shared`. There are two mechanisms and they are not the same thing.

**An OPEN module.** You put `@ApplicationModule(type = OPEN)` on the module. OPEN changes the encapsulation of that module. Normally a Spring Modulith module hides its sub-packages and only publishes its base package. An OPEN module exposes its internals too, so other modules can reach into its sub-packages.

**A shared module.** You list it in `@Modulithic(sharedModules = "shared")` on the application class. This says every module implicitly may depend on it, even after you start locking modules down with explicit allowed-dependency whitelists.

Here is why the distinction settled it for me. My `shared` kernel is laid out flat. Value objects sitting directly in the package, no `domain/model` nesting, no internal sub-packages at all. So OPEN would be exposing internals that do not exist. There is nothing to open up.

What I actually wanted was the other thing: exemption from dependency whitelisting. Once I start declaring `allowedDependencies` on my business modules to keep them honest, I do not want to list `shared` on every single one. `sharedModules` grants that exemption globally. That is exactly its job.

So `OPEN` and `sharedModules` solve different problems. `OPEN` is about what a module hides. `sharedModules` is about who is allowed to depend on it. For a flat kernel that everyone leans on, `sharedModules` is the right tool and `OPEN` is answering a question I never asked.

## The test that makes any of this real

None of the boundary rules matter unless something enforces them. Spring Modulith does it with a one-line test backed by ArchUnit static analysis.

```java
class ApplicationModulesTests {
    ApplicationModules modules = ApplicationModules.of(FintrackrApplication.class);

    @Test
    void verifyModularStructure() {
        modules.verify();
    }
}
```

Right now I have almost no cross-module calls, so this test is green and looks pointless. It is not. It is a tripwire. The first time I accidentally reach from one business module into another module's internals, or let a dependency point the wrong way, this test goes red in CI before the bad edge ever lands on the main branch. It earns its place the day I forget the rule, not the day I write it.

That, in the end, is what I like about Spring Modulith. The module boundaries are not a diagram in a wiki that slowly goes stale. They are checked by a test.
