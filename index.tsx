import React, { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';

const WEBHOOK_URL = 'https://hamzeh1128.app.n8n.cloud/webhook-test/ff226f9c-147e-4f50-8049-abdec8bf1224';

// --- Type Definitions ---
type MessagePart =
  | { type: 'text'; content: string }
  | { type: 'image'; content: string } // content is URL
  | { type: 'link'; content: string; text: string }; // content is URL

interface Message {
  id: number;
  sender: 'user' | 'ai';
  parts: MessagePart[];
}

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

// --- Components ---

const MessageRenderer: React.FC<{ part: MessagePart }> = ({ part }) => {
  switch (part.type) {
    case 'text':
      return <p>{part.content}</p>;
    case 'image':
      return <img src={part.content} alt="AI response" />;
    case 'link':
      return <a href={part.content} target="_blank" rel="noopener noreferrer">{part.text}</a>;
    default:
      return null;
  }
};

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => (
    <div className={`message-wrapper ${message.sender}`}>
      {message.sender === 'ai' && <div className="message-sender">J.A.R.V.I.S.</div>}
      <div className={`message ${message.sender}`}>
        <div className="message-content">
          {message.parts.map((part, index) => (
            <MessageRenderer key={index} part={part} />
          ))}
        </div>
      </div>
    </div>
);

const LoadingIndicator: React.FC = () => (
    <div className="message-wrapper ai">
        <div className="message-sender">J.A.R.V.I.S.</div>
        <div className="message ai">
            <div className="loading-indicator">
                <span>J.A.R.V.I.S. is thinking...</span>
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
            </div>
        </div>
    </div>
);

const MessageInput: React.FC<{
  onSendMessage: (text: string, imageBase64?: string) => void;
}> = ({ onSendMessage }) => {
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleBlur = () => {
      // When the keyboard is dismissed on mobile, this helps reset the view
      // and prevent the title from being permanently scrolled out of view.
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100); 
    };

    textarea.addEventListener('blur', handleBlur);

    return () => {
      textarea.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if(previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imageFile) return;

    let imageBase64: string | undefined;
    if (imageFile) {
      try {
        imageBase64 = await fileToBase64(imageFile);
      } catch (error) {
        console.error('Error converting file to base64:', error);
        return;
      }
    }
    
    onSendMessage(text, imageBase64);
    setText('');
    removeImage();
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
  }

  const isSendDisabled = !text.trim() && !imageFile;

  return (
    <div className="message-input-area">
      <div className="input-container">
        {previewUrl && (
          <div className="image-preview-container">
            <img src={previewUrl} alt="Preview" className="image-preview" />
            <button onClick={removeImage} className="remove-image-btn" aria-label="Remove image">×</button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="input-wrapper">
          <label htmlFor="file-input" aria-label="Attach image">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81a.75.75 0 0 0-1.06-1.06Z" />
            </svg>
          </label>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            ref={fileInputRef}
          />
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Message J.A.R.V.I.S..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
              }
            }}
          />
          <button type="submit" disabled={isSendDisabled} aria-label="Send message">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string, imageBase64?: string) => {
    const userMessageParts: MessagePart[] = [];
    if (text.trim()) {
        userMessageParts.push({ type: 'text', content: text });
    }
    if (imageBase64) {
        userMessageParts.push({ type: 'image', content: `data:image/jpeg;base64,${imageBase64}` });
    }

    const newUserMessage: Message = {
      id: Date.now(),
      sender: 'user',
      parts: userMessageParts,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    let errorForUser = 'Sorry, I encountered an error. Please try again.';

    try {
      const payload: { text: string; image?: string } = { text: text.trim() };
      if (imageBase64) {
        payload.image = imageBase64;
      }

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        errorForUser = `Error: The server responded with status ${response.status} (${response.statusText}). Please check the webhook URL and backend service.`;
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText) {
          errorForUser = 'Error: Received an empty response from the server.';
          throw new Error('Invalid response: Empty body');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        errorForUser = 'Error: Failed to understand the server\'s response. It was not valid JSON.';
        throw new Error('Invalid response: Not JSON');
      }
      
      if (data.response && Array.isArray(data.response)) {
        const newAiMessage: Message = {
            id: Date.now() + 1,
            sender: 'ai',
            parts: data.response,
        };
        setMessages((prev) => [...prev, newAiMessage]);
      } else {
          errorForUser = 'Error: The server\'s response was not in the expected format.';
          throw new Error('Invalid response format from backend');
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        parts: [{ type: 'text', content: errorForUser }],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <header>
        <h1>J.A.R.V.I.S.</h1>
      </header>
      <div className="chat-history" ref={chatHistoryRef}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && <LoadingIndicator />}
      </div>
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}