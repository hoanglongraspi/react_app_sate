import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthProvider';

export interface Recording {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

export const useRecordings = () => {
  const { user } = useAuth();

  return useQuery<Recording[]>({
    queryKey: ['recordings', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('recordings')
        .select('id, file_path, file_name, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Recording[];
    },
    enabled: !!user,
  });
}; 