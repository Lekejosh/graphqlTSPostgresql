import {
  BaseEntity,
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { Product } from "./Product";

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column()
  isVerified: boolean;

  @Column("jsonb", { nullable: true })
  profileImage: object[] | null;

  @OneToMany(() => Product, (product) => product.creator)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: "text", nullable: true })
  refreshToken: string | null;

  @Column({ type: "text", nullable: true })
  otp: string | null;

  @Column("timestamp", { nullable: true })
  otpExpire: Date | null;

  @Column({ type: "text", nullable: true })
  resetPasswordToken: string | null;

  @Column("timestamp", { nullable: true })
  resetPasswordTokenExpire: Date | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
