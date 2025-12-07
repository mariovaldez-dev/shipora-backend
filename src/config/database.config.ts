import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri:
    process.env.MONGODB_URI || 'mongodb://root:example@localhost:27017/shipora',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
}));
