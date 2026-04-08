# Backend JWT Implementation Guide (Java Spring Boot)

This document is a complete, step-by-step plan to implement JWT authentication in the Java backend for this project.

Purpose:
- Give a clear implementation path for backend JWT.
- Define token encoding, decoding, validation, and role authorization.
- Provide a handoff log so GPT or a developer can resume work later without losing context.

---

## 1. Scope and goal

Goal:
- Backend should issue JWT at login.
- Backend should validate JWT for protected APIs.
- Backend should authorize by role (ADMIN, DONOR, NGO).
- Frontend should only store token and send Bearer token.

Out of scope (optional later):
- Refresh token rotation.
- OAuth2 social login.

---

## 2. Concepts in plain language

JWT has 3 parts:
1. Header
2. Payload (claims)
3. Signature

Important:
- Payload is encoded, not encrypted.
- Never store sensitive secrets in JWT payload.
- Signature proves token integrity.

Encoding (token creation):
- Backend creates claims and signs with secret key.

Decoding and validation (token read):
- Backend verifies signature and expiry before trusting claims.

---

## 3. Implementation phases (high level)

1. Add security and JWT dependencies.
2. Add application JWT config values.
3. Create password hashing setup.
4. Create JwtService (create, parse, validate token).
5. Create auth DTOs and response models.
6. Create AuthService (signup/login business logic).
7. Create AuthController (login/signup endpoints).
8. Create JwtAuthenticationFilter (read Bearer token on every request).
9. Create SecurityConfig (stateless security + route rules).
10. Protect role-based endpoints and test end-to-end.

---

## 4. Pre-check before coding

Checklist:
- Confirm Spring Boot version (prefer 3.x).
- Confirm Java version (17 or 21 preferred).
- Confirm user table exists with role field.
- Confirm password is stored as hash (or migrate now).
- Confirm current login endpoint behavior.

Decision required:
- Username for authentication: email or username.
Recommendation: use email.

---

## 5. Dependencies (pom.xml)

Add or verify:
- spring-boot-starter-security
- spring-boot-starter-validation
- jjwt-api (0.11.5)
- jjwt-impl (0.11.5, runtime)
- jjwt-jackson (0.11.5, runtime)

If already present, keep versions aligned.

---

## 6. Application config

Add properties in application.properties or application.yml.

Required settings:
- app.jwt.secret
- app.jwt.access-token-minutes
- app.jwt.issuer (optional but recommended)

Example values:
- app.jwt.secret from environment variable in production.
- app.jwt.access-token-minutes=60

Security note:
- Never hardcode production secret in repository.

---

## 7. Password hashing policy

Use BCrypt.

Tasks:
1. Add PasswordEncoder bean (BCryptPasswordEncoder).
2. During signup, hash plain password before save.
3. During login, validate using passwordEncoder.matches(raw, hash).

Never compare plain text password from database.

---

## 8. JWT claims design

Use minimal claims:
- sub: user email (or user id)
- userId: numeric id
- role: ADMIN or DONOR or NGO
- iat
- exp
- iss (optional)

Do not include:
- password
- phone
- address
- private/internal secrets

---

## 9. JwtService implementation details

Create class: JwtService

Core methods:
1. String generateAccessToken(User user)
2. Claims extractAllClaims(String token)
3. String extractSubject(String token)
4. String extractRole(String token)
5. boolean isTokenExpired(String token)
6. boolean isTokenValid(String token, UserDetails userDetails)

Encoding flow:
1. Build claims map with userId and role.
2. Set subject.
3. Set issuedAt and expiration.
4. Sign token with HS256 and secret key.

Decoding flow:
1. Parse using parserBuilder with same signing key.
2. Read claims only after signature validation.
3. Catch ExpiredJwtException, SignatureException, MalformedJwtException.

Edge handling:
- Invalid token should not crash request pipeline.
- Return unauthorized response through security chain.

---

## 10. Auth DTOs and response contract

Create request DTOs:
1. LoginRequest
   - email
   - password
2. SignupRequest
   - name
   - email
   - password
   - role
   - phone
   - address

Create response DTO:
1. AuthResponse
   - token
   - user (id, name, email, role)

Recommended login response shape:

{
  "token": "eyJ...",
  "user": {
    "id": 10,
    "name": "A User",
    "email": "a@x.com",
    "role": "DONOR"
  }
}

Keep this stable for frontend compatibility.

---

## 11. AuthService implementation steps

Create class: AuthService

Signup method:
1. Validate email uniqueness.
2. Validate role is allowed.
3. Hash password.
4. Save user.
5. Option A: return success only.
6. Option B (recommended): issue JWT immediately and return AuthResponse.

Login method:
1. Find user by email.
2. If not found, throw unauthorized.
3. Compare password with hash.
4. Generate JWT.
5. Return AuthResponse.

Optional lockout policy:
- After multiple failed attempts, temporary lock.

---

## 12. AuthController endpoints

Create class: AuthController

Endpoints:
1. POST /auth/signup
2. POST /auth/login

Controller responsibilities:
- Input validation using annotations.
- Delegate to AuthService.
- Return proper status codes (200 or 201 for signup, 200 for login, 401 for invalid credentials).

---

## 13. JwtAuthenticationFilter

Create filter extending OncePerRequestFilter.

Request flow in filter:
1. Read Authorization header.
2. If missing or not Bearer token, continue chain.
3. Parse token and extract subject.
4. If subject exists and no current authentication:
   - load user via UserDetailsService
   - validate token
   - set authentication in SecurityContext
5. Continue filter chain.

On parse failure:
- Do not authenticate user.
- Continue chain; protected routes will return 401.

---

## 14. Security configuration (Spring Security)

Create or update SecurityConfig.

Required settings:
1. Disable csrf for API.
2. SessionCreationPolicy.STATELESS.
3. Permit all:
   - POST /auth/login
   - POST /auth/signup
4. Protect all other endpoints.
5. Add JWT filter before UsernamePasswordAuthenticationFilter.

Role-based rules (recommended):
- /admin/** requires role ADMIN
- /donor/** requires role DONOR
- /ngo/** requires role NGO

For your current endpoints, map by route patterns you already use.

---

## 15. UserDetails and authority mapping

If using custom UserDetails:
1. Map DB user role to GrantedAuthority.
2. Use prefix ROLE_ internally if needed by hasRole checks.
3. Keep API response role values clean (ADMIN, DONOR, NGO).

Consistency rule:
- Internal security authority may be ROLE_ADMIN.
- External token claim can be ADMIN.

---

## 16. Error handling standards

Implement global error response for auth and security:
- 400 for validation errors
- 401 for invalid/expired token or bad login
- 403 for role forbidden

Suggested JSON:
{
  "timestamp": "2026-04-07T10:20:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "path": "/foods"
}

---

## 17. Database migration checks

Confirm user table includes:
- id
- name
- email (unique)
- password_hash
- role
- phone
- address

If old column name is password, keep it but store hash only.

---

## 18. End-to-end test plan

Test sequence:
1. Signup new donor.
2. Login with correct password, verify token is returned.
3. Call protected endpoint without token, expect 401.
4. Call protected endpoint with token, expect success.
5. Tamper one token character, expect 401.
6. Use admin token on NGO-only endpoint, expect 403.
7. Validate expired token behavior.

Manual tool options:
- Postman
- curl
- frontend browser network panel

---

## 19. Frontend integration contract

Frontend expects:
1. Login and signup endpoint return token in one of common fields.
2. Token type is Bearer JWT.
3. Role present in user object or token claims.

Recommended stable contract:
- Always return token under field token.
- Always return user object with role.

---

## 20. Optional refresh token design (later)

When needed for longer sessions:
1. Access token short life (15 to 60 min).
2. Refresh token longer life (7 to 30 days).
3. Store refresh token server-side (DB or cache) for revocation.
4. Add POST /auth/refresh endpoint.
5. Rotate refresh token on every refresh.

Skip for first implementation to keep complexity low.

---

## 21. Production hardening checklist

1. Move JWT secret to environment variable.
2. Use HTTPS only in production.
3. Add rate limit on login endpoint.
4. Add account lockout policy for brute force.
5. Add audit logs for login success/failure.
6. Add CORS policy for known frontend origin only.
7. Add unit tests and integration tests for auth flows.

---

## 22. Suggested file structure (example)

Adjust package names to your project.

- src/main/java/.../config/SecurityConfig.java
- src/main/java/.../security/JwtAuthenticationFilter.java
- src/main/java/.../security/JwtService.java
- src/main/java/.../security/CustomUserDetailsService.java
- src/main/java/.../auth/AuthController.java
- src/main/java/.../auth/AuthService.java
- src/main/java/.../auth/dto/LoginRequest.java
- src/main/java/.../auth/dto/SignupRequest.java
- src/main/java/.../auth/dto/AuthResponse.java

---

## 23. Resume section for future GPT conversation

Use this section to continue work after a break.

### Current status

- Frontend JWT changes were intentionally removed.
- Backend JWT implementation is pending.
- This document is the source of truth for next steps.

### Progress tracker

- [ ] Phase 1: dependencies and config
- [ ] Phase 2: password hashing and user auth basics
- [ ] Phase 3: JwtService encode and decode
- [ ] Phase 4: AuthService and AuthController
- [ ] Phase 5: JWT filter and security config
- [ ] Phase 6: role-based authorization mapping
- [ ] Phase 7: end-to-end testing and bug fixes

### Notes log

Add timestamped notes here while implementing:

- 2026-04-07: Document created. No backend JWT code applied yet.
- TODO: Fill package names and endpoint mapping after backend code scan.

### Re-entry prompt template

When resuming, start with this prompt:

"Continue backend JWT implementation using BACKEND_JWT_STEPWISE_GUIDE.md. First inspect current Java backend files, map them to phases, then implement phase by phase with tests."

---

## 24. Definition of done

Implementation is complete only when all are true:
1. Login returns signed JWT.
2. Protected APIs reject missing or invalid token.
3. Role checks enforce ADMIN, DONOR, NGO access correctly.
4. Passwords are hashed and validated properly.
5. Integration tests or manual tests pass.
6. Error responses are clean and consistent.

---

End of guide.