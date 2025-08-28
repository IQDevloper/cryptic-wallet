Cryptic Gateway — Archon Project ID (c028af0a-9c65-4083-a2fb-fa3ba3c85c12)

RULES:

To maintain this project, follow these guidelines:

1. Use `npm` as the package manager.
2. To find the latest version of packages, consult the Context7 MCP.
3. If you need to interact with the browser, refer to the BrowserMCP.
4. To install a database, use Docker Compose to set up a PostgreSQL database.
5. To fetch the latest version of the Tatum API, consult the Archon MCP or the Tailwind 4 documentation in the knowledge base.
6. To get the latest version of Shadcn UI, refer to the Shadcn-UI MCP.
7. **Always use the Archon MCP** to document significant changes, optimizations, and architectural decisions for future reference.

# ARCHITECTURE PATTERNS

## tRPC Authentication Procedures

This project uses three distinct authentication patterns for different use cases:

### 1. `userAuthenticatedProcedure`
- **Use for**: General user operations (user profile, merchant list)
- **Authentication**: JWT token from user login session
- **Context**: Provides `ctx.user` and `ctx.dbUser`

### 2. `merchantAuthenticatedProcedure` 
- **Use for**: External API access with merchant API keys
- **Authentication**: Bearer token with merchant API key
- **Context**: Provides `ctx.merchant`

### 3. `userOwnsMerchantProcedure` ⭐
- **Use for**: Dashboard operations requiring merchant ownership verification
- **Authentication**: JWT token + automatic merchant ownership verification
- **Context**: Provides `ctx.user`, `ctx.dbUser`, and `ctx.merchant`
- **Benefits**: Eliminates duplicate database queries, centralizes ownership logic
- **Performance**: Reduces DB calls by ~1 query per request

## Component Architecture

### Dashboard Components
- Use tRPC hooks for data fetching: `trpc.merchant.getBalances.useQuery()`
- Implement proper loading states with Skeleton components
- Handle errors gracefully with toast notifications
- Follow the established component structure in `/src/app/dashboard/`

### Form Components
- Use `react-hook-form` with `zod` validation
- Implement proper TypeScript interfaces for props
- Handle nullable fields (like `imageUrl`) appropriately
- Follow the pattern established in `create-invoice-form.tsx`

## Database Query Optimization

When creating new tRPC procedures:
1. **Use appropriate authentication procedure** based on the use case above
2. **Minimize database queries** by leveraging context data from procedures  
3. **Combine related queries** using Promise.all() when possible
4. **Use Prisma includes** efficiently to fetch related data in single queries

[[calls]]
match = "when the user requests code examples, setup or configuration steps, or library/API documentation"
tool  = "context7"

[[calls]]
match = "when working on optimizations, architectural changes, or significant features"
tool  = "archon"
