-- Create devices table
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uuid TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  device_model TEXT,
  device_os TEXT,
  user_agent TEXT,
  iptv_url TEXT DEFAULT 'qetu.cc',
  iptv_port TEXT DEFAULT '8880',
  iptv_username TEXT DEFAULT 'fullip',
  iptv_password TEXT DEFAULT '5904441732',
  player_expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  iptv_expire_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_access_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can register device"
ON public.devices FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read devices"
ON public.devices FOR SELECT
USING (true);

CREATE POLICY "Anyone can update devices"
ON public.devices FOR UPDATE
USING (true)
WITH CHECK (true);

-- Function to generate unique device code (2 letters + 8 numbers)
CREATE OR REPLACE FUNCTION public.generate_device_code()
RETURNS TEXT AS $$
DECLARE
  letters TEXT;
  numbers TEXT;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 2 random letters (A-Z)
    letters := chr(65 + floor(random() * 26)::int) || chr(65 + floor(random() * 26)::int);
    
    -- Generate 8 random numbers (0-9)
    numbers := lpad(floor(random() * 100000000)::text, 8, '0');
    
    -- Combine
    new_code := letters || numbers;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.devices WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to register or update device
CREATE OR REPLACE FUNCTION public.register_or_update_device(
  p_device_uuid TEXT,
  p_device_model TEXT DEFAULT NULL,
  p_device_os TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  device_code TEXT,
  player_expire_at TIMESTAMP WITH TIME ZONE,
  iptv_expire_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN,
  iptv_url TEXT,
  iptv_port TEXT,
  iptv_username TEXT,
  iptv_password TEXT
) AS $$
DECLARE
  v_code TEXT;
  v_device_exists BOOLEAN;
BEGIN
  -- Check if device already exists
  SELECT EXISTS(SELECT 1 FROM public.devices WHERE device_uuid = p_device_uuid) INTO v_device_exists;
  
  IF v_device_exists THEN
    -- Update last access and device info
    UPDATE public.devices 
    SET 
      last_access_at = NOW(),
      device_model = COALESCE(p_device_model, device_model),
      device_os = COALESCE(p_device_os, device_os),
      user_agent = COALESCE(p_user_agent, user_agent)
    WHERE device_uuid = p_device_uuid
    RETURNING code INTO v_code;
    
    -- Return device data
    RETURN QUERY
    SELECT 
      d.code,
      d.player_expire_at,
      d.iptv_expire_at,
      d.is_blocked,
      d.iptv_url,
      d.iptv_port,
      d.iptv_username,
      d.iptv_password
    FROM public.devices d
    WHERE d.device_uuid = p_device_uuid;
  ELSE
    -- Generate new code
    v_code := public.generate_device_code();
    
    -- Insert new device
    INSERT INTO public.devices (
      device_uuid,
      code,
      device_model,
      device_os,
      user_agent,
      iptv_url,
      iptv_port,
      iptv_username,
      iptv_password,
      player_expire_at,
      iptv_expire_at,
      created_at,
      last_access_at
    ) VALUES (
      p_device_uuid,
      v_code,
      p_device_model,
      p_device_os,
      p_user_agent,
      'qetu.cc',
      '8880',
      'fullip',
      '5904441732',
      NOW() + INTERVAL '7 days',
      NOW() + INTERVAL '30 days',
      NOW(),
      NOW()
    )
    RETURNING 
      code,
      player_expire_at,
      iptv_expire_at,
      is_blocked,
      iptv_url,
      iptv_port,
      iptv_username,
      iptv_password
    INTO device_code, player_expire_at, iptv_expire_at, is_blocked, iptv_url, iptv_port, iptv_username, iptv_password;
    
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get device by code
CREATE OR REPLACE FUNCTION public.get_device_by_code(p_code TEXT)
RETURNS TABLE (
  device_uuid TEXT,
  iptv_url TEXT,
  iptv_port TEXT,
  iptv_username TEXT,
  iptv_password TEXT,
  player_expire_at TIMESTAMP WITH TIME ZONE,
  iptv_expire_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.device_uuid,
    d.iptv_url,
    d.iptv_port,
    d.iptv_username,
    d.iptv_password,
    d.player_expire_at,
    d.iptv_expire_at,
    d.is_blocked
  FROM public.devices d
  WHERE d.code = UPPER(p_code);
END;
$$ LANGUAGE plpgsql;