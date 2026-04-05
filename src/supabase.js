import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gvtvwrkicysfvjqwcqsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dHZ3cmtpY3lzZnZqcXdjcXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODA2NDIsImV4cCI6MjA4OTE1NjY0Mn0.yNZsSp_QAv5RUmfTYzfVosbLh5Q7bremonkyhN-qdVU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
