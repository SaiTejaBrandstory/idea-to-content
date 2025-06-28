import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    const apiKey = process.env.REPHRASY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'REPHRASY_API_KEY not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://v1-humanizer.rephrasy.ai/api', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model: "Undetectable Model",
        words: true,
        costs: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Rephrasy API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to humanize text' },
      { status: 500 }
    );
  }
} 