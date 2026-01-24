# Railway Redis Setup Guide

This guide describes how to provision and connect a Redis instance for the Best Shot API on Railway.

## 1. Provisioning Redis

1.  Open your project dashboard on [Railway](https://railway.app/).
2.  Click **"New"** button.
3.  Select **"Database"** -> **"Redis"**.
4.  Railway will provision a new Redis container.

## 2. Environment Variables

Once Redis is provisioned, Railway automatically exposes the connection string, but we need to ensure it's named `REDIS_URL`.

1.  Click on the new **Redis** service card.
2.  Go to the **"Variables"** tab.
3.  Find the variable `REDIS_URL`.
    *   *Note:* Railway usually provides `REDIS_URL` automatically. If it provides something else (like `REDIS_PRIVATE_URL`), you may need to alias it.
4.  Go to your **API Service** card.
5.  Go to **"Variables"**.
6.  Ensure `REDIS_URL` is set. You can use Railway's variable reference syntax: `${{Redis.REDIS_URL}}`.

## 3. Configuration Notes

*   **Persistence:** We are treating Redis as **ephemeral** (Cache). If the Redis service restarts, data will be lost. This is acceptable because the application has a **Hydration Service** that rebuilds the scoreboard from PostgreSQL on startup.
*   **Version:** Alpine / Standard Redis is fine. No special modules are required.
*   **Security:** Railway's private network handles security. The API service connects to Redis over the private network, so no public port exposure is needed.
