import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ advisorId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { advisorId } = await params;
    
    // Get the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Create unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `advisor-${advisorId}-${Date.now()}.${fileExtension}`;
    
    // Define the upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "advisors");
    
    // Create directory if it doesn't exist
    await mkdir(uploadDir, { recursive: true });
    
    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    
    // Create the public URL
    const publicUrl = `/uploads/advisors/${fileName}`;
    
    // Update advisor profile with new image URL
    const advisor = await prisma.advisor.update({
      where: { id: advisorId },
      data: {
        profileImageUrl: publicUrl,
      },
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any)?.id as string,
        action: "ADVISOR_PHOTO_UPDATE",
        entityType: "Advisor",
        entityId: advisorId,
        metadata: { profileImageUrl: publicUrl },
      },
    });

    return NextResponse.json({ 
      success: true,
      profileImageUrl: publicUrl,
      advisor,
    });
  } catch (error) {
    console.error("Failed to upload advisor photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}