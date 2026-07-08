---
title: "Keep the Clock Out of Your Domain Model"
slug: "java-domain-model-clock-injection-testable-date-logic"
date: 2026-07-08
draft: true
description: "Why injecting a java.time.Clock into a domain aggregate makes tests harder than they need to be, and how passing a resolved date instead keeps the domain a pure function."
summary: "I almost wired a Clock into an aggregate so it could reject future-dated transactions. Then I realized the domain never needed to know the time. It only needed to be told what today is."
tags: ["java", "domain-driven-design", "testing", "clock", "clean-code"]
---
