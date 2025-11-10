-- Step 1: Rename column nome to full_name
ALTER TABLE public.profiles 
RENAME COLUMN nome TO full_name;

-- Step 2: Create trigger function to auto-create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name',  -- From email signup
      new.raw_user_meta_data->>'name'        -- From Google OAuth
    ),
    new.raw_user_meta_data->>'avatar_url'    -- From Google OAuth
  );
  RETURN new;
END;
$$;

-- Step 3: Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Backfill existing users who don't have profiles
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.email  -- Fallback to email if no name
  ),
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;