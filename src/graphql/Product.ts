import { extendType, floatArg, nonNull, objectType, stringArg } from "nexus";
import { NexusGenObjects } from "../../nexus-typegen";
import { Product } from "../entities/Product";
import { Context } from "src/types/Context";
import { User } from "../entities/User";

export const ProductType = objectType({
  name: "Product",
  definition(t) {
    t.nonNull.int("id"),
      t.nonNull.string("name"),
      t.nonNull.float("price"),
      t.nonNull.int("creatorId"),t.field("createdBy",{
        type:'User',
        resolve(parent,_args,_context:Context,_info):Promise<User | null>{
          return User.findOne({where:{id:parent.creatorId}})
      })
  },
});

export const ProductQuery = extendType({
  type: "Query",
  definition(t) {
    t.nonNull.list.nonNull.field("products", {
      type: "Product",
      resolve(_parent, _args, context: Context, _info): Promise<Product[]> {
        //  return Product.find()
        const { conn } = context;
        return conn.query(`select * from product`);
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
          throw new Error("Can't create product, without loggin in");
        }
        return Product.create({ name, price, creatorId: userId }).save();
      },
    });
  },
});
