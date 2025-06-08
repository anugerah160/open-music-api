# Branch:

- main | Open Music API 3 (current main)
- open-music-api-1 | Open Music API 1
- open-music-api-2 | Open Music API 2
- open-music-api-3 | Open Music API 3

# OpenMusic API v3 Documentation (FINAL)

Welcome to the official documentation for the OpenMusic API v3. This guide provides all the necessary information for developers to interact with the API endpoints.

The OpenMusic API is a robust RESTful service designed for managing a music catalog, including albums, songs, and user-specific playlists. Version 3 introduces advanced features such as asynchronous playlist exporting via message queues, album cover image uploads, and an album liking system with server-side caching.

## Table of Contents
1.  [Getting Started](#1-getting-started)
    - [Base URL](#base-url)
    - [Error Response Format](#error-response-format)
2.  [Authentication](#2-authentication)
    - [Obtaining Tokens (Login)](#obtaining-tokens-login)
    - [Using the Access Token](#using-the-access-token)
    - [Refreshing the Access Token](#refreshing-the-access-token)
3.  [API Endpoints](#3-api-endpoints)
    - [Users](#users)
    - [Authentications](#authentications)
    - [Albums](#albums)
    - [Songs](#songs)
    - [Playlists](#playlists)
    - [Collaborations (Optional)](#collaborations-optional)
    - [Playlist Exports](#playlist-exports)
4.  [Consumer Service Setup](#4-consumer-service-setup)

---

## 1. Getting Started

### Base URL
All API endpoints are relative to the following base URL:

http://localhost:5000


### Error Response Format
The API uses a standardized JSON format for error responses.

-   **Client Errors (4xx Status Codes)**: These errors indicate an issue with the client's request (e.g., missing required fields, invalid data, or insufficient permissions).

    ```json
    {
        "status": "fail",
        "message": "{Pesan tergantung dari status code}"
    }
    ```

-   **Server Errors (5xx Status Codes)**: These errors indicate an unexpected problem on the server.

    ```json
    {
        "status": "error",
        "message": "terjadi kegagalan pada server kami"
    }
    ```

---

## 2. Authentication

Most endpoints require authentication via **JSON Web Tokens (JWT)**. The API uses a `Bearer` token scheme.

### Obtaining Tokens (Login)
To access protected resources, you must first register a user and then authenticate (log in) to receive an `accessToken` and a `refreshToken`.

-   **Endpoint**: `POST /authentications`
-   **Request Body**:
    ```json
    {
        "username": "yourusername",
        "password": "yourpassword"
    }
    ```
-   **Success Response** (`201 Created`):
    ```json
    {
        "status": "success",
        "message": "Authentication berhasil ditambahkan",
        "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
    }
    ```

### Using the Access Token
For every request to a protected endpoint, include the `accessToken` in the `Authorization` header.

**Example:**

Authorization: Bearer <your_access_token>


### Refreshing the Access Token
The `accessToken` is short-lived (30 minutes). Use the `refreshToken` to get a new `accessToken` without requiring the user to log in again.

-   **Endpoint**: `PUT /authentications`
-   **Request Body**:
    ```json
    {
        "refreshToken": "your_refresh_token"
    }
    ```
-   **Success Response** (`200 OK`):
    ```json
    {
        "status": "success",
        "message": "Access Token berhasil diperbarui",
        "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
    }
    ```

---

## 3. API Endpoints

### Users

#### **Register User**
Registers a new user in the system.

-   `POST /users`
-   **Request Body**:
    | Parameter  | Type   | Required | Description                |
    | :--------- | :----- | :------- | :------------------------- |
    | `username` | string | Yes      | The user's unique username.|
    | `password` | string | Yes      | The user's password.       |
    | `fullname` | string | Yes      | The user's full name.      |
-   **Success Response (`201 Created`)**:
    ```json
    {
        "status": "success",
        "message": "User berhasil ditambahkan",
        "data": {
            "userId": "user-abcdef123456"
        }
    }
    ```

### Authentications

#### **Login User**
-   `POST /authentications`
-   See section [Obtaining Tokens](#obtaining-tokens-login) for details.

#### **Refresh Access Token**
-   `PUT /authentications`
-   See section [Refreshing the Access Token](#refreshing-the-access-token) for details.

#### **Logout User**
Invalidates a refresh token.
-   `DELETE /authentications`
-   **Request Body**:
    | Parameter      | Type   | Required |
    | :------------- | :----- | :------- |
    | `refreshToken` | string | Yes      |
-   **Success Response (`200 OK`)**:
    ```json
    {
        "status": "success",
        "message": "Refresh token berhasil dihapus"
    }
    ```

### Albums

#### **Create Album**
-   `POST /albums`
-   **Request Body**:
    | Parameter | Type   | Required |
    | :-------- | :----- | :------- |
    | `name`    | string | Yes      |
    | `year`    | number | Yes      |
-   **Success Response (`201 Created`)**: `{"status": "success", "data": {"albumId": "album-..."}}`

#### **Get Album by ID**
-   `GET /albums/{id}`
-   **Success Response (`200 OK`)**:
    ```json
    {
        "status": "success",
        "data": {
            "album": {
                "id": "album-...",
                "name": "An Album Name",
                "year": 2023,
                "coverUrl": "http://.../cover.jpg",
                "songs": [ /* ... song objects ... */ ]
            }
        }
    }
    ```

#### **Update Album by ID**
-   `PUT /albums/{id}`
-   **Request Body**: Same as Create Album.
-   **Success Response (`200 OK`)**: `{"status": "success", "message": "Album berhasil diperbarui"}`

#### **Delete Album by ID**
-   `DELETE /albums/{id}`
-   **Success Response (`200 OK`)**: `{"status": "success", "message": "Album berhasil dihapus"}`

#### **Upload Album Cover**
-   `POST /albums/{id}/covers`
-   **Request Body**: `multipart/form-data`
    | Parameter | Type | Required | Constraints                            |
    | :-------- | :--- | :------- | :------------------------------------- |
    | `cover`   | file | Yes      | Max size: 512KB, must be an image file.|
-   **Success Response (`201 Created`)**: `{"status": "success", "message": "Sampul berhasil diunggah"}`

#### **Like an Album**
-   `POST /albums/{id}/likes`
-   **Authentication**: Required.
-   **Success Response (`201 Created`)**: `{"status": "success", "message": "Album berhasil disukai"}`

#### **Unlike an Album**
-   `DELETE /albums/{id}/likes`
-   **Authentication**: Required.
-   **Success Response (`200 OK`)**: `{"status": "success", "message": "Batal menyukai album"}`

#### **Get Album Like Count**
-   `GET /albums/{id}/likes`
-   **Description**: Retrieves the total like count. Cached for 30 minutes.
-   **Success Response (`200 OK`)**:
    ```json
    {
        "status": "success",
        "data": {
            "likes": 25
        }
    }
    ```
-   **Headers**: Includes `X-Data-Source: cache` if the data is served from the cache.

### Songs
*(Functionality unchanged from v1/v2)*
-   `POST /songs`: Create a new song.
-   `GET /songs`: Get all songs, with optional `?title` and `?performer` query parameters for filtering.
-   `GET /songs/{id}`: Get a specific song by its ID.
-   `PUT /songs/{id}`: Update a song by its ID.
-   `DELETE /songs/{id}`: Delete a song by its ID.

### Playlists

#### **Create Playlist**
-   `POST /playlists`
-   **Authentication**: Required.
-   **Request Body**:
    | Parameter | Type   | Required |
    | :-------- | :----- | :------- |
    | `name`    | string | Yes      |
-   **Success Response (`201 Created`)**: `{"status": "success", "data": {"playlistId": "playlist-..."}}`

#### **Get User's Playlists**
-   `GET /playlists`
-   **Authentication**: Required.
-   **Description**: Returns playlists owned by or collaborated on by the authenticated user.
-   **Success Response (`200 OK`)**: `{"status": "success", "data": {"playlists": [...]}}`

#### **Delete Playlist**
-   `DELETE /playlists/{id}`
-   **Authentication**: Required.
-   **Description**: Deletes a playlist. Only the owner can perform this action.

#### **Add Song to Playlist**
-   `POST /playlists/{id}/songs`
-   **Authentication**: Required.
-   **Request Body**:
    | Parameter | Type   | Required |
    | :-------- | :----- | :------- |
    | `songId`  | string | Yes      |
-   **Description**: Adds a song to a playlist. Requires owner or collaborator access.

#### **Get Songs in Playlist**
-   `GET /playlists/{id}/songs`
-   **Authentication**: Required.
-   **Description**: Retrieves songs from a playlist. Requires owner or collaborator access.

#### **Delete Song from Playlist**
-   `DELETE /playlists/{id}/songs`
-   **Authentication**: Required.
-   **Request Body**: Same as Add Song to Playlist.

### Collaborations 

#### **Add Collaborator**
-   `POST /collaborations`
-   **Authentication**: Required.
-   **Description**: Adds a collaborator to a playlist. Only the playlist owner can perform this action.
-   **Request Body**:
    | Parameter    | Type   | Required |
    | :----------- | :----- | :------- |
    | `playlistId` | string | Yes      |
    | `userId`     | string | Yes      |
-   **Success Response (`201 Created`)**: `{"status": "success", "data": {"collaborationId": "collab-..."}}`

#### **Delete Collaborator**
-   `DELETE /collaborations`
-   **Authentication**: Required.
-   **Request Body**: Same as Add Collaborator.

### Playlist Exports

#### **Request Playlist Export**
-   `POST /export/playlists/{playlistId}`
-   **Authentication**: Required.
-   **Description**: Sends a job to the message queue to export a playlist's contents to the target email. Only the playlist owner can perform this action.
-   **Request Body**:
    | Parameter     | Type   | Required |
    | :------------ | :----- | :------- |
    | `targetEmail` | string | Yes      |
-   **Success Response (`201 Created`)**:
    ```json
    {
        "status": "success",
        "message": "Permintaan Anda sedang kami proses"
    }
    ```

---

## 4. Consumer Service Setup

The playlist export feature relies on a separate background worker (consumer) to process jobs from the RabbitMQ queue.

### **To run the consumer:**

1.  Navigate to the `consumer` directory in your project.
    ```bash
    cd consumer
    ```
2.  Install the required dependencies.
    ```bash
    npm install
    ```
3.  Ensure your `.env` file in the `consumer` directory is correctly configured with database, RabbitMQ, and SMTP credentials.
4.  Start the consumer process in a separate terminal.
    ```bash
    node src/consumer.js
    ```

The consumer will now listen for `export:playlists` jobs and send emails accordingly.
