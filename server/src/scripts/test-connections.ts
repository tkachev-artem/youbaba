import 'dotenv/config';
import { connectDatabase } from '../config/database';
import { initMinIO, minioClient, minioConfig } from '../config/minio';

async function testConnections() {
  console.log('🔍 Testing connections...\n');

  // Test MongoDB
  try {
    console.log('📊 Testing MongoDB connection...');
    await connectDatabase();
    console.log('✅ MongoDB connection successful!\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }

  // Test MinIO
  try {
    console.log('🖼️ Testing MinIO connection...');
    await initMinIO();
    
    // List buckets
    const buckets = await minioClient.listBuckets();
    console.log('✅ MinIO connection successful!');
    console.log('📦 Available buckets:', buckets.map(b => b.name).join(', '));
    console.log('🔗 Public URL:', minioConfig.publicUrl);
    console.log('');
  } catch (error) {
    console.error('❌ MinIO connection failed:', error);
    process.exit(1);
  }

  console.log('🎉 All connections successful!');
  process.exit(0);
}

testConnections();
