---
title: "Keep the Clock Out of Your Domain Model"
slug: "java-domain-model-clock-injection-testable-date-logic"
date: 2026-07-08
draft: false
description: "Why injecting a java.time.Clock into a domain aggregate makes tests harder than they need to be, and how passing a resolved date instead keeps the domain a pure function."
summary: "I almost wired a Clock into an aggregate so it could reject future-dated transactions. Then I realized the domain never needed to know the time. It only needed to be told what today is."
tags: ["java", "domain-driven-design", "testing", "clock", "clean-code"]
---

I was writing the first real business method on an aggregate in my portfolio tracker. A deposit. One of its rules: you cannot record a transaction dated in the future. Simple enough. To check that, the method needs to know what "today" is.

My first instinct was the one every tutorial teaches. Inject a `java.time.Clock`.

```java
public void recordDeposit(Money amount, LocalDate date, Clock clock) {
    if (date.isAfter(LocalDate.now(clock))) {
        throw new FutureDatedTransactionException(date, LocalDate.now(clock));
    }
    tradingBalance = tradingBalance.add(amount);
}
```

It works. You can pass a fixed clock in tests and everything is deterministic. This is the standard advice, and it is not wrong. But something nagged at me, so I stopped and asked why my aggregate was reading a clock at all.

## The aggregate does not care what time it is

Here is the thing. My domain rule is not "reject deposits that happen after the current instant." My domain rule is "reject deposits whose business date is after today." Those sound the same. They are not.

The instant, the wall clock, the timezone, the question of whether "now" means the server's now or the user's now, all of that is context from the outside world. It is an input to the decision, not part of the decision. The aggregate's job is to compare two dates. Give it two dates.

```java
public void recordDeposit(Money amount, LocalDate date, LocalDate today) {
    if (date.isAfter(today)) {
        throw new FutureDatedTransactionException(date, today);
    }
    tradingBalance = tradingBalance.add(amount);
}
```

The `Clock` is gone. So is `LocalDate.now(...)` inside the domain. The method is now a pure function of what it was handed. Same inputs, same outcome, forever.

## Where does "today" come from then

At the edge. The application service, the thing that already owns the transaction boundary and talks to the outside world, resolves it once and passes it down.

```java
// application layer, the edge
LocalDate today = LocalDate.now(clock);
portfolio.recordDeposit(amount, date, today);
```

That is the one place a `Clock` belongs, if you inject one at all. The messy question of "what is now, and in whose timezone" gets answered exactly once, where you have the context to answer it. The domain stays clean.

## The test got simpler, not just deterministic

This is the part that convinced me. With the clock version, a test has to build a `Clock.fixed(someInstant, someZone)` and reason about which day that instant lands on. That is ceremony, and it drags timezone thinking into a test that has nothing to do with timezones.

With the resolved-date version, the test says what it means:

```java
LocalDate today = LocalDate.of(2026, 7, 1);
LocalDate tomorrow = today.plusDays(1);

assertThatThrownBy(() -> portfolio.recordDeposit(amount, tomorrow, today))
    .isInstanceOf(FutureDatedTransactionException.class);
```

No mock. No fixed clock. No instant-to-date arithmetic. Two dates and a rule. The test reads like the sentence I would say out loud to describe the rule.

## When you would still inject a Clock

I am not saying `Clock` injection is a bad pattern. It is the right tool when a component genuinely needs to resolve the current time itself, like a scheduler, a token expiry checker, or a service that stamps audit timestamps. Those things own the act of reading the clock.

An aggregate enforcing a business invariant usually does not. It is handed the facts and applies the rule. So the test I use for myself now is: does this class need to know the time, or does it just need to be told a date somebody else already resolved? If it is the second one, the `Clock` is one layer too deep.

I integrated exactly zero `Clock` instances to make my domain testable. That felt like the opposite of what the tutorials promised, and it was better.
