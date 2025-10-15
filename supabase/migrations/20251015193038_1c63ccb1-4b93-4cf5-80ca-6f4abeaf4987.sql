-- Fix security warnings by setting search_path on all functions

-- Update generate_device_code function
CREATE OR REPLACE FUNCTION public.generate_device_code()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT EXISTS(SELECT 1 FROM devices WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Update register_or_update_device function
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_device_exists BOOLEAN;
BEGIN
  -- Check if device already exists
  SELECT EXISTS(SELECT 1 FROM devices WHERE device_uuid = p_device_uuid) INTO v_device_exists;
  
  IF v_device_exists THEN
    -- Update last access and device info
    UPDATE devices 
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
    FROM devices d
    WHERE d.device_uuid = p_device_uuid;
  ELSE
    -- Generate new code
    v_code := generate_device_code();
    
    -- Insert new device
    INSERT INTO devices (
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
$$;

-- Update get_device_by_code function
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  FROM devices d
  WHERE d.code = UPPER(p_code);
END;
$$;