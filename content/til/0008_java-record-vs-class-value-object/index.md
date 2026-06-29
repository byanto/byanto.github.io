+++
title = "Why I swapped a Java record for a class (and the bug that made me do it)"
date = 2026-06-29T18:35:00+07:00
slug = "java-record-vs-class-value-object"
description = "A Java record gives value objects equality for free, but its constructor is always public. Here is when a class with a private cons
tructor is the better choice."
summary = "I reached for a Java record out of habit and it quietly let bad data into my domain model. The fix was a plain class with a private con
structor, plus a BigDecimal equality trap on the way."
tags = ["Java", "Record", "Value Object", "DDD", "BigDecimal", "Clean Code", "Software Design"]
draft = false
+++

# Java records gave me equality for free, then quietly let bad data in

A few days ago I reached for a Java `record` without thinking about it. It's my default for value objects now, and most of the time that's the right call. This time it wasn't, and it took me a while to see why.

## The setup

I'm building a small app that tracks investment portfolios. One of the value objects is `Quantity`: how many of a thing you own. The annoying part is that "how many" isn't one rule, it's two:

- Stock shares are always whole numbers. You can't own 10.5 shares of a stock.
- Mutual fund units are fractional. My broker reports them to four decimal places.

Same idea, two different validation rules depending on what you're holding. So I wrote two factory methods:

```java
Quantity.ofShares(new BigDecimal("100"))    // fine
Quantity.ofShares(new BigDecimal("10.5"))   // rejected, not a whole number
Quantity.ofUnits(new BigDecimal("12.3456")) // fine
```

And I made `Quantity` a record, because records hand you `equals`, `hashCode`, immutability and a constructor without writing any of it yourself. Writing that by hand felt like a step backwards.

## Where it broke

A record's canonical constructor (the one that takes all the fields) is always at least as visible as the record itself. You cannot make it private. Which means nothing stops this:

```java
new Quantity(new BigDecimal("10.5")); // 10.5 shares. Straight past both factories.
```

All my validation lives in `ofShares` and `ofUnits`. But the front door was never locked. Anyone could skip the rules, including me six months from now.

Here's the way I ended up explaining it to myself. Picture a club with two staffed doors. One bouncer only lets in whole-number guests, the other only lets in guests rounded to four decimals. Those are the factory methods. The problem is that the building rules say the staff door has to be at least as open as the public door. So no matter how good your bouncers are, there's an unguarded side entrance and people keep wandering in through it. A plain class lets you lock that side door.

## The fix

Drop the record, use a class, make the constructor private:

```java
public class Quantity {
    private final BigDecimal value;

    private Quantity(BigDecimal value) {
        // shared checks: not null, not negative
    }

    public static Quantity ofShares(BigDecimal value) { /* must be scale 0 */ }
    public static Quantity ofUnits(BigDecimal value)  { /* scale 4 or less */ }
}
```

Now there's no way to build a `Quantity` without going through one of the factory methods. The side door is gone.

## What it costs you

You lose the free `equals` and `hashCode`, so you write them yourself. And with `BigDecimal` that's its own trap, because `BigDecimal.equals` looks at scale. To it, `10` and `10.0` are not equal.

That usually makes a hand-written `equals` risky. It's safe in my case only because I pin the scale when the object is built: every share is stored at scale 0, every unit at scale 4. Two quantities that are equal in value always have the same scale, so handing the work off to `BigDecimal.equals` is fine. If I hadn't done that, I'd have had to use `compareTo` instead.

## What I'd tell myself next time

Reach for a record when one constructor can enforce every rule, for every way the object can be created. Reach for a class with a private constructor when you've got several factory methods with different rules and you can't let anyone slip past them.

Records are still my default for value objects. I just stopped assuming the front door is locked, because it never is.
