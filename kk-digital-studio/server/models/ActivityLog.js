import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    actorName: { type: String, default: 'System' },
    actorType: { type: String, enum: ['admin', 'public', 'system'], default: 'admin' },
    action: { type: String, required: true }, // create | update | delete | login | logout | status | upload | ...
    entity: { type: String, default: '' },
    entityId: { type: String, default: '' },
    summary: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ createdAt: -1 });

export default mongoose.model('ActivityLog', schema);
