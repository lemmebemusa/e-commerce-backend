const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = 'product-images';

const storage = {
  async uploadImage(fileBuffer, fileName, options = {}) {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 80,
      bucket = BUCKET_NAME
    } = options;

    try {
      const compressedBuffer = await sharp(fileBuffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality })
        .toBuffer();

      const sanitizedBaseName = fileName
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      const finalFileName = `${sanitizedBaseName}-${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(finalFileName, compressedBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '31536000'
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(finalFileName);

      return {
        success: true,
        url: urlData.publicUrl,
        fileName: finalFileName
      };
    } catch (error) {
      console.error('Storage upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async deleteImage(fileName, bucket = BUCKET_NAME) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Storage delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  async uploadEmployeePhoto(fileBuffer, fileName) {
    return this.uploadImage(fileBuffer, fileName, {
      maxWidth: 600,
      maxHeight: 600,
      quality: 85
    });
  },

  async uploadBanner(fileBuffer, fileName) {
    return this.uploadImage(fileBuffer, fileName, {
      maxWidth: 1400,
      maxHeight: 500,
      quality: 80
    });
  }
};

module.exports = storage;