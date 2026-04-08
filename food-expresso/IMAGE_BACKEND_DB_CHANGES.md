# Image Support: Backend + Database Changes

This note captures the backend/database work needed so NGO and Admin users can view donor-uploaded food photos across devices and sessions.

## Why this is needed

Current frontend donor image upload stores images in browser localStorage for demo-safe behavior.

That means:
- Images are visible only in the donor's browser
- NGO/Admin users cannot reliably see those images
- Data is not persistent across devices

To make image sharing real, persist image info in backend and DB.

## Recommended approach

Use URL/path storage in DB (preferred) instead of full base64 in DB.

- Store actual file in server folder or object storage
- Save file URL/path in food table
- Return this URL in all food APIs

## Database change (recommended)

```sql
ALTER TABLE food
ADD COLUMN image_url VARCHAR(512) NULL;
```

Alternative (heavier):

```sql
ALTER TABLE food
ADD COLUMN image_base64 LONGTEXT NULL;
```

## Spring Boot files to update (minimal)

1. `Food.java` (entity)
- Add field:
  - `private String imageUrl;` (recommended)
  - or `private String imageBase64;`
- Add getter/setter
- Map with `@Column(name = "image_url")`

2. `FoodController.java`
- Keep current JSON endpoint if you send image URL/base64 directly
- OR add multipart endpoint for file upload

3. `FoodService.java`
- Save incoming image field when creating food
- Include image field in returned food object

4. `FoodRepository.java`
- Usually no custom query needed if using JPA default methods

## API contract expected by frontend

Any one of these fields in food response will render image automatically:
- `imageUrl`
- `photoUrl`
- `foodImageUrl`
- `imageBase64`
- `photoBase64`
- `foodImageBase64`

Best to standardize on:

```json
{
  "id": 123,
  "title": "Rice",
  "imageUrl": "http://localhost:8087/uploads/foods/rice-123.jpg"
}
```

## Endpoints that should return image field

- `GET /foods`
- `GET /foods/available`
- `GET /foods/donor/{id}`
- `GET /foods/warehouse` (if shown in UI)

## Optional upload endpoint (multipart)

```http
POST /foods/with-image
Content-Type: multipart/form-data

fields:
- title
- quantity
- location
- expiryDate
- latitude
- longitude
- donorId
- image (file)
```

Response should include stored `imageUrl`.

## Validation suggestions

Backend should validate:
- file type: jpg/jpeg/png
- max size: e.g., 5MB
- sanitize filename

## Rollout plan

1. Add DB column
2. Update entity + create flow
3. Return image field from list endpoints
4. Restart backend
5. Verify donor upload, NGO display, admin display

## Notes

- This document records only image-related backend work.
- Frontend already contains rendering support and donor-side upload UI.
