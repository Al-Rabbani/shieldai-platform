import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Auth against the VPS, not against Base44.
 *
 * The builder's original provider opened every session by calling
 * `/api/apps/public/prod/public-settings/by-id/<appId>` through the Base44 SDK's own axios client.
 * On the VPS that path does not exist, and the request never settled, so `isLoadingPublicSettings`
 * stayed true forever: App.jsx rendered its loading branch permanently and the page looked blank
 * because that branch is a spinner sized by Tailwind classes.
 *
 * The platform already answers /auth/me, /auth/login, /auth/logout and /auth/refresh, and nginx
 * serves them same-origin under /api/, so the session cookie needs no CORS work. A 401 here is not
 * an error, it is the ordinary signed-out state, and it must settle the loading flags rather than
 * leaving the app spinning.
 *
 * The exported context shape is unchanged so the 21 components that read useAuth keep working.
 */

const API = '/api';
const BASE = import.meta.env.BASE_URL || '/';

const AuthContext = createContext();

const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const PLATFORM_TAGLINE = 'The Agentic AI Security Operating System';

/* Branding is tenant-scoped, so it needs a session: this runs after /auth/me, never before it.
 * The name goes in the tab title and the colours become CSS variables, so any surface can use the
 * tenant's identity without this file knowing which surface that is. */
const applyBranding = (branding) => {
  if (typeof document === 'undefined' || !branding) return;
  const name = branding.display_name || branding.name;
  if (name) document.title = `${name} — ${PLATFORM_TAGLINE}`;
  const root = document.documentElement;
  if (branding.primary_color) root.style.setProperty('--brand-primary', branding.primary_color);
  if (branding.secondary_color) root.style.setProperty('--brand-secondary', branding.secondary_color);
  if (branding.tenant_id) root.setAttribute('data-tenant', String(branding.tenant_id));
};

const loadBranding = async () => {
  try {
    const response = await fetch(`${API}/tenant/branding`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const branding = await readJson(response);
    applyBranding(branding);
    return branding;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const response = await fetch(`${API}/auth/me`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const currentUser = await readJson(response);
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthError(null);
        // Branding belongs to a tenant, so it is read here, where a session exists.
        const branding = await loadBranding();
        setAppPublicSettings({ id: 'gdsa-radar', public_settings: branding || {} });
      } else if (response.status === 401 || response.status === 403) {
        // Signed out is a normal state, not a failure.
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'unknown', message: `Auth check returned ${response.status}` });
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'unknown', message: error?.message || 'Auth check failed' });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    // Nothing public is loaded any more. Branding is tenant-scoped and needs a session, so it is read
    // inside checkUserAuth once /auth/me has returned a user; reading it here could only ever 401.
    setIsLoadingPublicSettings(false);
    setAuthError(null);
    await checkUserAuth();
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  const logout = async (shouldRedirect = true) => {
    try {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // A failed logout still clears the local state; the cookie is the server's to expire.
    }
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecked(true);
    if (shouldRedirect) {
      window.location.assign(`${BASE}login`);
    }
  };

  const navigateToLogin = () => {
    window.location.assign(`${BASE}login`);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
