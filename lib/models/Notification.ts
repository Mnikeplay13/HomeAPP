import mongoose, { Schema, type Document } from "mongoose"

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId
  householdId: mongoose.Types.ObjectId
  type: "task_assigned" | "task_due_soon" | "product_low_stock" | "product_expiring" | "menu_added"
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    type: {
      type: String,
      enum: ["task_assigned", "task_due_soon", "product_low_stock", "product_expiring", "menu_added"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema)
