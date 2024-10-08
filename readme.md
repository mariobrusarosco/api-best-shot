# Best Shot API

## What

An API for my side project _Football App_ named Best Shot [(for more info)](https://github.com/mariobrusarosco/best-shot).

## Why

- One word is a side project where I intend to validate new libraries, frameworks, and new things in general. This API will provide real endpoints and real requests so I have a grasp on what are their cons and pros as close as I can get in the real world.
- I can have a basic understanding of how a back-end structure supports a Front End Application.
- I can grasp some ORM concepts and see their benefits in action.
- I can learn and practice Typescript for an ORM

## How

By using:

1. **Node** with **Express**
2. **Typescript**
3. **Drizzle** as **ORM** connected to a Database
4. **Supabse** as a **POSTGRES** database
5. **Railway** as Host
6. Providing a swagger via **Postman**

## Getting Started

- Clone the project
- Open a **terminal**, go to the root level of the project, and install all dependencies by running:

```bash
git clone git@github.com:mariobrusarosco/api-best-shot.git
```

## Install

We need to initialize a local Database. This project uses Postgres, so we need to:

- Install Postgres on the machine (It will vary depending on the OS)
- Create a user with a password
- Crete a database (recommended name 'besthost')
- Set a _connection string_ inside the `.env` under the name of _DB_CREDENTIALS_

`DB_CREDENTIALS="postgresql://{userNameHere}:{passwordHere}@localhost:5432/{dbNameHere}"`

e.g. `DB_CREDENTIALS="postgresql://jonh_doe:12345@localhost:5432/best-shot"`

- Apply the last versioned migration using `Drizzle`

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

- Run the project:

```bash
yarn dev
```

Now, the **API** is exposed on _http://localhost:9090_

## Accessing DB content

```
yarn drizzle-kit studio
```

## Creating a Local Member

```
yarn dev
yarn drizzle-kit studio
```

Then access `https://local.drizzle.studio`. Use Studio's UI to create a Member

## Running a migration

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

# Profiling and Logging

Coming Soon

# Hosting the API

We're using **Railway** to host the project. The url are:

[https://api-one-word.mariobrusarosco.com/](<[https://api-one-word.up.railway.app/](https://api-one-word.mariobrusarosco.com/)>)

---

# Swagger

[Postman URL](https://documenter.getpostman.com/view/2930329/VUjSGjLU#intro)

---
