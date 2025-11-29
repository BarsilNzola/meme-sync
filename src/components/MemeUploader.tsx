'use client';

import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MemeTemplate } from '@/types/Meme';
import { uploadMeme } from '@/lib/storage';

interface MemeUploaderProps {
  onMemeSelect: (meme: MemeTemplate) => void;
}

const defaultMemes: MemeTemplate[] = [
  {
    id: 'distracted_bf',
    name: 'Distracted Boyfriend',
    imageUrl: '/memes/distracted-boyfriend.jpg',
    duration: 5,
    frameCount: 3,
    defaultTiming: [0, 1.5, 3],
  },
  {
    id: 'drake',
    name: 'Drake Hotline Bling',
    imageUrl: '/memes/drake.jpg',
    duration: 4,
    frameCount: 2,
    defaultTiming: [0, 2],
  },
  {
    id: 'change_my_mind',
    name: 'Change My Mind',
    imageUrl: '/memes/change-my-mind.jpg',
    duration: 6,
    frameCount: 1,
    defaultTiming: [0],
  },
];

export default function MemeUploader({ onMemeSelect }: MemeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMemeId, setSelectedMemeId] = useState<string | null>(null);
  const [customMemePreview, setCustomMemePreview] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    }
  }, []);

  const handleFileSelect = async (file: File) => {
    try {
      // Upload to Supabase Storage
      const imageUrl = await uploadMeme(file);
      
      const customMeme: MemeTemplate = {
        id: `custom_${Date.now()}`,
        name: file.name,
        imageUrl: imageUrl, // This is now a permanent URL from Supabase
        duration: 5,
        frameCount: 1,
        defaultTiming: [0],
      };
      
      setSelectedMemeId(customMeme.id);
      setCustomMemePreview(imageUrl);
      onMemeSelect(customMeme);
    } catch (error) {
      console.error('Upload failed:', error);
      // Fallback to object URL if upload fails
      const fallbackUrl = URL.createObjectURL(file);
      const customMeme: MemeTemplate = {
        id: `custom_${Date.now()}`,
        name: file.name,
        imageUrl: fallbackUrl,
        duration: 5,
        frameCount: 1,
        defaultTiming: [0],
      };
      
      setSelectedMemeId(customMeme.id);
      setCustomMemePreview(fallbackUrl);
      onMemeSelect(customMeme);
    }
  };

  const handleDefaultMemeSelect = (meme: MemeTemplate) => {
    setSelectedMemeId(meme.id);
    setCustomMemePreview(null);
    onMemeSelect(meme);
  };

  return (
    <Card className="bg-background/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">Choose Your Meme</CardTitle>
        <CardDescription className="text-muted-foreground">
          Select from templates or upload your own image
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Meme Templates */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Popular Templates</h3>
          <div className="grid grid-cols-2 gap-4">
            {defaultMemes.map((meme) => (
              <Button
                key={meme.id}
                variant="outline"
                className={`h-auto p-0 aspect-video relative group overflow-hidden border-2 transition-all duration-200 ${
                  selectedMemeId === meme.id 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary'
                }`}
                onClick={() => handleDefaultMemeSelect(meme)}
              >
                {/* Meme Preview Image */}
                <img 
                  src={meme.imageUrl}
                  alt={meme.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay */}
                <div className={`absolute inset-0 transition-all duration-200 flex items-center justify-center ${
                  selectedMemeId === meme.id 
                    ? 'bg-primary/20' 
                    : 'bg-black/40 group-hover:bg-black/20'
                }`}>
                  {selectedMemeId === meme.id && (
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
                
                {/* Name Label */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                  <div className="text-primary-foreground font-medium text-sm text-center">{meme.name}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Upload Custom Meme</h3>
          
          {/* Custom Meme Preview */}
          {customMemePreview && (
            <div className="border-2 border-primary rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded overflow-hidden border border-border">
                  <img 
                    src={customMemePreview} 
                    alt="Custom meme preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="text-foreground font-medium">Custom Meme Selected</div>
                  <div className="text-muted-foreground text-sm">
                    Ready to sync with audio!
                  </div>
                </div>
                <div className="bg-primary text-primary-foreground rounded-full p-2">
                  <Check className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer relative ${
              isDragging 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            } ${customMemePreview ? 'hidden' : 'block'}`}
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-foreground font-medium mb-2">
              Drag & drop your meme image
            </div>
            <div className="text-muted-foreground text-sm">
              or click to browse files
            </div>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}