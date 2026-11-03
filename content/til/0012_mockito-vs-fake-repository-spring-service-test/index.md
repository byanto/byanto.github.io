---
title: "My Service Test Has No Mockito, and That Is on Purpose"
slug: "mockito-vs-fake-repository-spring-service-test"
date: 2026-10-30
draft: false
description: "Mock or fake in a Spring service unit test? A Java example of what each one actually checks, why a fake repository must copy on read, and where Mockito still fits."
summary: "Most tutorials mock the repository in a service test. I use a fake instead. Here is what each test really proves, and the sabotage that showed my fake could not fail."
tags: ["java", "testing", "mockito", "spring-boot", "junit"]
---

Almost every Spring tutorial I have seen tests the service layer the same way. Mock the
repository, mock the other service, call the method, `verify` the calls. My service tests do
not have a single Mockito import, and someone asked me why. Fair question. Here is the answer,
with one honest problem I found on the way.

## The service

I am building a small investment tracker. Recording a deposit does two things in one transaction:
the portfolio's trading balance goes up, and so does the cash balance of the broker account.

```java
@Transactional
public TransactionId handle(RecordDepositCommand command) {
    Portfolio portfolio = portfolioRepository.findById(command.portfolioId())
            .orElseThrow(() -> new PortfolioNotFoundException(command.portfolioId()));
    Deposit deposit = portfolio.recordDeposit(command.amount(), command.date(), LocalDate.now(clock));
    portfolioRepository.save(portfolio);

    brokerageApi.applyCashFlow(portfolio.brokerAccountId(), deposit.cashFlow());
    return deposit.id();
}
```

## The Mockito version

```java
verify(portfolioRepository).save(any());
verify(brokerageApi).applyCashFlow(accountId, Money.of(new BigDecimal("1000000")));
```

This passes. But what did it prove? That two lines exist in the method. It does not prove that
the balance and the cash on the broker account end up equal, which is the only thing I care
about. And if I refactor the service, say I load the account differently, the test breaks while
the behaviour stays the same.

## The fake version

```java
recordDepositService.handle(command);

Portfolio loaded = portfolioRepository.findById(portfolio.id()).orElseThrow();
assertThat(loaded.tradingBalance()).isEqualTo(amount);
assertThat(brokerAccount.rdn()).isEqualTo(amount);
```

The fakes are tiny in-memory classes behind the same interfaces. The Brokerage fake even calls
the real `BrokerAccount.applyCashFlow`, so its rule (no negative cash) runs in my test too. The
test asks about state, which is what the service is for.

## The catch: my fake could not fail

Then someone asked the obvious follow-up. Your fake is code as well, who tests it?

So I tried it. I commented out `portfolioRepository.save(portfolio)` in the service and ran the
test. Green.

The reason was one line in the fake:

```java
public Optional<Portfolio> findById(PortfolioId id) {
    return Optional.ofNullable(portfolios.get(id));
}
```

It returned the same object it had stored. The service changed that object, the test read that
same object back, and `save` never mattered. The real JPA adapter maps to an entity and back, so
without `save` the deposit would simply be gone.

The fix is to copy on read, the way the real adapter does:

```java
return Optional.ofNullable(portfolios.get(id))
        .map(p -> Portfolio.reconstitute(p.id(), p.brokerAccountId(), p.name(),
                p.tradingBalance(), p.transactions(), p.acquisitions()));
```

Same sabotage, now red. A shallow copy is enough for me because the transactions are records and
the other parts have only final fields. If that changes, the copy has to go deeper.

The full answer to "who tests the fake" is a contract test: one abstract test class describing
the repository, run once against the fake and once against the real adapter on Testcontainers.
That is next on my list.

## So where does Mockito fit?

In my controller tests, every one of them. A controller has no state. Its job is to turn an HTTP
request into a command and an exception into a status code. "Was the use case called with this
command?" is exactly the right question there, and `@MockitoBean` answers it.

Mockito also makes sense for things you cannot read back as state, like sending an e-mail or
publishing an event, or for failures a fake cannot easily produce, like a timeout.

## What I take from it

Pick the double by asking what the test has to prove. A call, then mock. A state, then fake. And
if you fake, sabotage the production code once and watch the test go red. If it does not, your
fake is the thing that needs fixing.