# API Contract

Base URL: `http://localhost:4000`

## Auth

### `POST /auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "Awa",
  "dateOfBirth": "1998-01-01T00:00:00.000Z"
}
```

Response:

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "displayName": "Awa",
    "role": "USER",
    "verificationStatus": "DRAFT"
  },
  "token": "jwt_token"
}
```

### `POST /auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

## Files

### `POST /files/avatar`

Form-data:

- `file`: image file

Response returns a public `url` like `/uploads/avatars/...`.

### `POST /files/media`

Form-data:

- `file`: image or video file

### `POST /files/verification`

Form-data:

- `file`: image, video, or PDF

## Posts

### `POST /posts`

Request:

```json
{
  "caption": "My post",
  "visibility": "PUBLIC",
  "media": [
    {
      "kind": "IMAGE",
      "url": "/uploads/media/file.jpg",
      "mimeType": "image/jpeg",
      "allowDownload": false,
      "expiresAt": "2026-08-04T10:00:00.000Z"
    }
  ]
}
```

`media` can also be a single object instead of an array.

### `POST /posts/:id/like`
### `DELETE /posts/:id/like`
### `POST /posts/:id/comments`

## Messages

### `POST /messages/conversations/:userId`

Creates or returns a conversation.

### `POST /messages/conversations/:conversationId/messages`

Request:

```json
{
  "text": "Hello",
  "media": {
    "kind": "IMAGE",
    "url": "/uploads/media/file.jpg",
    "mimeType": "image/jpeg",
    "allowDownload": true,
    "expiresAt": "2026-08-04T10:00:00.000Z"
  }
}
```

`media` can also be an array.

## Verification

### `POST /verification/request`

### `GET /verification/queue`

Accessible to `MODERATOR` and `ADMIN`.

### `POST /verification/:id/review`

## Social

### `POST /social/:userId/follow`
### `DELETE /social/:userId/follow`
### `GET /social/feed`
### `GET /users/search?q=...`
### `GET /users/:userId`

## Notifications

### `GET /notifications`
### `POST /notifications/:id/read`

## Reports

### `POST /reports`
### `GET /reports/mine`
### `GET /reports/queue`

Accessible to `MODERATOR` and `ADMIN`.

## Admin

### `GET /admin/summary`
### `GET /admin/reports`
### `GET /admin/users`
### `PATCH /admin/users/:id/role`

`PATCH /admin/users/:id/role` accepts:

```json
{
  "role": "USER"
}
```

## Rules

- `USER` can register and use basic features after approval
- `MODERATOR` can review verification requests and reports
- `ADMIN` can do everything, including role assignment
- expired media is cleaned automatically by the backend job

