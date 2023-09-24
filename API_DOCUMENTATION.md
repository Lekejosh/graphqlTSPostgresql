# TypeScript GraphQL API Documentation

Welcome to the TypeScript GraphQL API documentation. This documentation serves as a reference guide for developers who are integrating or interacting with the API. The API is organized into three main folders: Authentication, User, and Product.

To begin integrating our TypeScript GraphQL API, you can fork our GitHub repository. This repository contains essential code examples and resources to help you get started seamlessly. Follow these steps:

1. Visit our [GitHub repository](https://github.com/lekejosh/graphqlTSPostgresql).
2. Click the "Fork" button in the top right corner of the repository page.
3. Once forked, clone your forked repository to your local development environment using the following command:

```bash
git clone https://github.com/"yourUsername"/graphqlTSPostgresql.git
```

Explore the provided code examples, documentation, and integration guides to kickstart your project. We're here to assist you throughout the integration process. If you have any questions or need further guidance, please don't hesitate to reach out.

## Table of Contents

- [Authentication](#authentication)
  - [User Registration](#user-registration)
  - [Login](#login)
  - [Forgot Password](#forgot-password)
  - [Refresh Token](#refresh-token)
  - [Verify Email](#verify-email)
  - [Request OTP](#request-otp)
  - [Update Password](#update-password)
  - [Reset Password](#reset-password)

- [User](#user)
  - [Managing User Profiles](#managing-user-profiles)
  - [Querying User Data](#querying-user-data)

- [Product](#product)
  - [Adding New Products](#adding-new-products)
  - [Updating Product Information](#updating-product-information)
  - [Querying Product Data](#querying-product-data)

## Authentication

The Authentication folder contains a set of operations to facilitate secure user interactions with our API. Developers can use these endpoints to enable features such as user registration, login, password management, and more.

For API requests within the Authentication folder, please note that the use of a bearer token is typically not necessary. These endpoints often serve as initial entry points to establish user authentication. However, once a user is authenticated, subsequent API requests may require a bearer token for authorization.

## User

The User folder is dedicated to user profile management and data retrieval. Developers can use these endpoints to interact with user-related information within the system.

## Product

The Product folder covers the management of product-related information within our platform. Developers can utilize these endpoints to add new products, update existing ones, and retrieve product details.

Whether you're integrating our services into an existing application or maintaining an established system, this documentation will be your go-to resource for effectively working with our TypeScript GraphQL API. If you have any questions or require further assistance, please don't hesitate to contact me via [email](mailto:lekejosh6wf@gmail.com) or on [GitHub](https://github.com/lekejosh). Happy coding!