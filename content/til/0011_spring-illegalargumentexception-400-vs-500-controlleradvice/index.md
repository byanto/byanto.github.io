---
title: "Same exception, two meanings: why I don't map IllegalArgumentException to 400"
slug: "spring-illegalargumentexception-400-vs-500-controlleradvice"
date: 2026-10-27
draft: false
description: "Mapping IllegalArgumentException to 400 in a Spring @RestControllerAdvice hides server bugs as client errors. Map by where the exception is thrown, and test that a use-case bug stays a 500."
summary: "I wrote a test to prove a server bug never becomes a 400. It went red on the first run, against my own controller."
tags: ["java", "spring-boot", "rest-api", "exception-handling", "testing"]
---

My investment tracker got its first REST endpoint this week: record a buy. The controller takes a JSON request, turns it into a command with real value objects, and hands it to the use case. The value objects guard themselves. An ISIN with a wrong check digit, a fractional number of shares, an unknown quantity kind: each throws an `IllegalArgumentException`.

So the obvious move is one line in the global advice:

```java
@ExceptionHandler(IllegalArgumentException.class)
ProblemDetail handle(IllegalArgumentException ex) { /* 400 */ }
```

Bad input, 400, done. I almost wrote it.

## The same exception from two places

`IllegalArgumentException` in my codebase means "the caller passed nonsense". Until now the caller was always my own code, so it always meant a bug. REST adds a caller that may legitimately send nonsense: the user.

But the use case still throws it too, and not because of the user. By the time the command exists, every input has already passed its value object. If an `IllegalArgumentException` comes out of the use case after that, it comes from somewhere else:

- a fee rate stored as `1.5` in the database, and `Percentage` refuses it
- a `Money` with a second currency in a system that only knows IDR
- a negative price, which the edge and the domain both reject, so it can only be my bug

With the global handler, all three answer **400**. The client looks at a perfectly valid request, sends it again, gets 400 again. No 500, no error in the log, no alert. The bug just sits there.

The type cannot tell me who made the mistake. The place can.

## Catch it where it means "bad input", and nowhere else

The translation from request to command is the only place where an `IllegalArgumentException` means the client is wrong. So the `catch` lives there, inside the method that does the translation:

```java
private RecordBuyCommand toCommand(UUID portfolioId, RecordBuyRequest request) {
    try {
        // build AssetId, Quantity, Money from the request
    } catch (IllegalArgumentException ex) {
        throw new InvalidRequestException(ex.getMessage(), ex);
    }
}
```

`InvalidRequestException` maps to 400. Everything the use case throws later is not caught and stays a 500. And the original exception goes along as the cause, so the stack trace still shows which value object complained.

## The test that found my bug

I wanted a test that pins the other direction: an `IllegalArgumentException` from the use case must not become a 400. In a `@WebMvcTest` I stubbed the mocked use case to throw one and expected the exception to come out of MockMvc unchanged.

It went red on the first run:

```
Status expected:<500> but was:<400>
```

My first version did not have the `catch` inside `toCommand`. It had a `try` around this line:

```java
transactionId = recordBuyUseCase.handle(toCommand(portfolioId, request));
```

Which wraps the translation *and* the use case. Exactly the bug the test was written for, and I had already built it. Moving the `catch` into `toCommand` fixed it, and it also means nobody can widen it by accident later.

One detail in the assertion: `hasCauseInstanceOf(IllegalArgumentException.class)`, not `hasRootCauseInstanceOf`. Since my own exception now carries the original as its cause, a root-cause check would also pass if the use case's exception got wrapped. The direct cause is what proves it came through untouched.

## What I take from it

A global handler sees the exception class and nothing else. When one class means two things, the handler has to sit where only one of them is possible. And the test that matters most is the boring one that checks the case you think can't happen.