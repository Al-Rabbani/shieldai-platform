import React, { useState } from "react";
import { User, Shield, Bell, Monitor, Save, Upload, Key, Globe, Moon, Sun, Monitor as MonitorIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    full_name: "John Doe",
    job_title: "CISO",
    organization: "Acme Corp",
    email: "john@acme.com",
    timezone: "UTC",
    language: "en",
  });

  const [preferences, setPreferences] = useState({
    theme: "dark",
    density: "comfortable",
    code_font: "jetbrains",
  });

  const [notifications, setNotifications] = useState({
    email_critical: true,
    email_high: true,
    email_medium: false,
    email_weekly: true,
    inapp_critical: true,
    inapp_high: true,
    inapp_autofix: true,
    inapp_scan: false,
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          <p className="text-slate-400 text-sm">Manage your account, preferences, and notifications</p>
        </div>
        <Button className="bg-amber-500 hover:bg-amber-600 text-black">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Profile Section */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-white">Profile Information</CardTitle>
          </div>
          <CardDescription className="text-slate-400">Your personal details and contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="text-2xl font-bold text-slate-400">JD</span>
            </div>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Upload className="w-4 h-4 mr-2" />
              Upload Avatar
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Full Name</Label>
              <Input value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300">Job Title</Label>
              <Input value={profile.job_title} onChange={(e) => setProfile({...profile, job_title: e.target.value})} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300">Organization</Label>
              <Input value={profile.organization} onChange={(e) => setProfile({...profile, organization: e.target.value})} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300">Timezone</Label>
              <Select value={profile.timezone} onValueChange={(v) => setProfile({...profile, timezone: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Europe/Berlin">Berlin</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Language</Label>
              <Select value={profile.language} onValueChange={(v) => setProfile({...profile, language: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            <CardTitle className="text-white">Security</CardTitle>
          </div>
          <CardDescription className="text-slate-400">Password, 2FA, and active sessions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
            <div>
              <p className="text-sm font-semibold text-white">Change Password</p>
              <p className="text-xs text-slate-400">Update your password regularly</p>
            </div>
            <Button variant="outline" className="border-slate-700 text-slate-300">
              <Key className="w-4 h-4 mr-2" />
              Change
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
            <div>
              <p className="text-sm font-semibold text-white">Two-Factor Authentication</p>
              <p className="text-xs text-slate-400">Add an extra layer of security</p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Enable 2FA
            </Button>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50">
            <p className="text-sm font-semibold text-white mb-3">Active Sessions</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Chrome on MacOS • London, UK</span>
                <span className="text-green-400">Active now</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Safari on iPhone • 2 hours ago</span>
                <button className="text-red-400 hover:underline">Revoke</button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <CardTitle className="text-white">Notification Preferences</CardTitle>
          </div>
          <CardDescription className="text-slate-400">Choose what and how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">Email Notifications</h4>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <span className="text-sm text-slate-300">Critical findings</span>
              <Switch checked={notifications.email_critical} onCheckedChange={(v) => setNotifications({...notifications, email_critical: v})} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <span className="text-sm text-slate-300">High severity findings</span>
              <Switch checked={notifications.email_high} onCheckedChange={(v) => setNotifications({...notifications, email_high: v})} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <span className="text-sm text-slate-300">Weekly digest</span>
              <Switch checked={notifications.email_weekly} onCheckedChange={(v) => setNotifications({...notifications, email_weekly: v})} />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">In-App Notifications</h4>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <span className="text-sm text-slate-300">Critical findings</span>
              <Switch checked={notifications.inapp_critical} onCheckedChange={(v) => setNotifications({...notifications, inapp_critical: v})} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30">
              <span className="text-sm text-slate-300">AutoFix PRs created</span>
              <Switch checked={notifications.inapp_autofix} onCheckedChange={(v) => setNotifications({...notifications, inapp_autofix: v})} />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-800/30">
            <Label className="text-slate-300">Severity Threshold</Label>
            <Select defaultValue="high">
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-2">
                <SelectValue placeholder="Select threshold" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="high">Critical and High only</SelectItem>
                <SelectItem value="critical">Critical only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MonitorIcon className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-white">Appearance</CardTitle>
          </div>
          <CardDescription className="text-slate-400">Customize how ShieldAI looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-300">Theme</Label>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setPreferences({...preferences, theme: "dark"})}
                className={`flex-1 p-4 rounded-lg border flex items-center justify-center gap-2 ${preferences.theme === "dark" ? "border-amber-500 bg-amber-500/10" : "border-slate-700 bg-slate-800"}`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-sm">Dark</span>
              </button>
              <button
                onClick={() => setPreferences({...preferences, theme: "light"})}
                className={`flex-1 p-4 rounded-lg border flex items-center justify-center gap-2 ${preferences.theme === "light" ? "border-amber-500 bg-amber-500/10" : "border-slate-700 bg-slate-800"}`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-sm">Light</span>
              </button>
              <button
                onClick={() => setPreferences({...preferences, theme: "system"})}
                className={`flex-1 p-4 rounded-lg border flex items-center justify-center gap-2 ${preferences.theme === "system" ? "border-amber-500 bg-amber-500/10" : "border-slate-700 bg-slate-800"}`}
              >
                <Monitor className="w-5 h-5" />
                <span className="text-sm">System</span>
              </button>
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Density</Label>
            <Select value={preferences.density} onValueChange={(v) => setPreferences({...preferences, density: v})}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="comfortable">Comfortable (Default)</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Code Font</Label>
            <Select value={preferences.code_font} onValueChange={(v) => setPreferences({...preferences, code_font: v})}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="jetbrains">JetBrains Mono (Default)</SelectItem>
                <SelectItem value="fira">Fira Code</SelectItem>
                <SelectItem value="cascadia">Cascadia Code</SelectItem>
                <SelectItem value="monospace">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}