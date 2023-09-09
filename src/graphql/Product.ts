import { extendType, nonNull, objectType, stringArg, floatArg } from "nexus"; // Fixed the import order
import { Product } from "../entities/Product";
import { Context } from "../types/Context"; // Fixed the import path
import { User } from "../entities/User";

export const ProductType = objectType({
  name: "Product",
  definition(t) {
    t.nonNull.string("id"),
      t.nonNull.string("name"),
      t.nonNull.float("price"),
      t.nonNull.string("creatorId");
    t.string("message");
    t.field("createdBy", {
      type: "User",
      resolve(parent, _args, _context: Context, _info): Promise<User | null> {
        return User.findOne({ where: { id: parent.creatorId } });
      },
    });
  },
});

export const ProductQuery = extendType({
  type: "Query",
  definition(t) {
    t.nonNull.list.nonNull.field("products", {
      type: "Product",
      resolve(_parent, _args, _context: Context, _info): Promise<Product[]> {
        return Product.find();
      },
    });
  },
});

export const CreateProductMutation = extendType({
  type: "Mutation",
  definition(t) {
    t.nonNull.field("createProduct", {
      type: "Product",
      args: {
        name: nonNull(stringArg()),
        price: nonNull(floatArg()),
      },
      resolve(_parent, args, context: Context, _info): Promise<Product> {
        const { name, price } = args;
        const { userId } = context;

        if (!userId) {
          throw new Error("Can't create a product without logging in");
        }
        return Product.create({ name, price, creatorId: userId }).save();
      },
    });
  },
});

export const UpdateProduct = extendType({
  type: "Mutation",
  definition(t) {
    t.nonNull.field("updateProduct", {
      type: "Product",
      args: {
        id: nonNull(stringArg()),
        price: floatArg(),
        name: stringArg(),
      },
      async resolve(_parent, args, context: Context, _info) {
        const { id, price, name } = args;
        const product = await Product.findOne({ where: { id } });

        if (!product) {
          throw new Error("Product not found");
        }
        const { userId } = context;

        if (!userId) throw new Error("Please log in to access this resource");

        if (product.creatorId !== userId) throw new Error("Product not found");

        if (!price && !name) {
          throw new Error("Either 'price' or 'name' must be provided");
        }

        if (price) {
          product.price = price;
        }

        if (name) {
          product.name = name;
        }

        await product.save();

        return product;
      },
    });
  },
});

export const QueryUserProducts = extendType({
  type: "Query",
  definition(t) {
    t.nonNull.list.nonNull.field("userProducts", {
      // Changed the field name to "userProducts"
      type: "Product",
      resolve(_parent, _args, context: Context, _info): Promise<Product[]> {
        const { userId } = context;
        if (!userId) {
          throw new Error("Can't fetch products without logging in");
        }
        return Product.find({ where: { creatorId: userId } });
      },
    });
  },
});

export const SingleProduct = extendType({
  type: "Query",
  definition(t) {
    t.nonNull.field("product", {
      type: "Product",
      args: {
        id: nonNull(stringArg()),
      },
      resolve(_parent, args, _context: Context, _info) {
        const { id } = args;
        return Product.findOne({ where: { id: id } });
      },
    });
  },
});

export const DeleteProduct = extendType({
  type: "Mutation",
  definition(t) {
    t.nonNull.field("deleteProduct", {
      type: "Product",
      args: {
        id: nonNull(stringArg()),
        productName: nonNull(stringArg()),
      },
      async resolve(_parent, args, context: Context, _info) {
        const { id, productName } = args;
        const { userId } = context;
        if (!userId) throw new Error("Please Login to access this resource");
        const product = await Product.findOne({ where: { id } });
        if (!product) throw new Error("Product does not exist");
        if (product.creatorId !== userId) throw new Error("Product not found");
        if (productName === "") {
          throw new Error(
            "Please type in the product name to confirm your delete"
          );
        }
        if (productName !== product.name) {
          throw new Error(
            "productName must be the same as the product name, in other to confirm your delete"
          );
        }
        await product.remove();

        return { message: "Delete Successful" };
      },
    });
  },
});
