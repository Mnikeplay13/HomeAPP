import mongoose, { Schema, type Document } from "mongoose"

export interface ITask extends Document {
  title: string
  description: string
  status: "pending" | "completed" | "overdue"
  priority: "high" | "medium" | "low"
  category: string
  dueDate: Date
  assignedTo: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  householdId: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ["pending", "completed", "overdue"], default: "pending" },
    priority: { type: String, enum: ["high", "medium", "low"], required: true },
    category: { type: String, required: true },
    dueDate: { type: Date, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema)
