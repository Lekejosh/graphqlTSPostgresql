import { extendType, floatArg, nonNull, objectType, stringArg } from "nexus";
import { NexusGenObjects } from "../../nexus-typegen";
import { Product } from "../entities/Product";
import { Context } from "src/types/Context";
import { User } from "../entities/User";

export const ProductType = objectType({
  name: "Product",
  definition(t) {
    t.nonNull.string("id"),
      t.nonNull.string("name"),
      t.nonNull.float("price"),
      t.nonNull.string("creatorId"),t.field("createdBy",{
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

       return Product.find()
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

export const UpdateProduct = extendType({
  type: "Mutation",
  definition(t) {
    t.nonNull.field('product', {
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
const {userId}=context

if(!userId) throw new Error("Please login to access this resources");

        if(product.creatorId !== userId) throw new Error("You didn't create this product");

        
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
    t.nonNull.list.nonNull.field("products", {
      type: "Product",
      resolve(_parent, _args, context: Context, _info): Promise<Product[]> {
 const { userId } = context;
        if(!userId){
          throw new Error("Can't product, without loggin in");
        }
       return Product.find({where:{creatorId:userId}})
      },
    });
  }
})

export const SingleProduct = extendType({
   type: "Query",
  definition(t) {
    t.nonNull.field("product", {
      type: "Product",
      args:{
        id:nonNull(stringArg())
      },
      resolve(_parent, args, _context: Context, _info){
        const {id} = args
       return Product.findOne({where:{id:id}})
      },
    });
  }
})