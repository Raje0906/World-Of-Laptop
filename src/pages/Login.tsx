import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
  store_id: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface Store {
  _id: string;
  name: string;
  address: string;
}

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const selectedStoreId = watch("store_id");

  // Fetch stores on component mount
  useEffect(() => {
    const loadStores = async () => {
      await fetchStores();
      // If there's only one store, preselect it
      if (stores.length === 1) {
        setValue('store_id', stores[0]._id);
      }
    };
    
    loadStores();
  }, []);

  const fetchStores = async () => {
    try {
      console.log("Fetching stores...");
      const response = await fetch("/api/auth/stores");
      const data = await response.json();
      
      console.log("Stores response:", data);
      
      if (data.success) {
        setStores(data.data.stores);
        console.log("Stores loaded:", data.data.stores);
      } else {
        toast({ title: "Error", description: "Failed to fetch stores" });
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast({ title: "Error", description: "Failed to fetch stores" });
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      if (!data.store_id) {
        toast({ title: "Error", description: "Please select a store to log into" });
        setIsLoading(false);
        return;
      }
      
      // Send identifier, password, and selected store_id
      const payload = {
        identifier: data.identifier,
        password: data.password,
        store_id: data.store_id  // Always include store_id as it's now required
      };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let result: any = null;
      let isJson = false;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
        isJson = true;
      } else {
        result = await response.text();
      }

      if (isJson && result.success) {
        // Use the auth context to login
        login(result.data.token, result.data.user);
        
        // Redirect to dashboard (root path)
        navigate("/");
      } else {
        if (response.status === 429) {
          toast({ title: "Too Many Requests", description: "You have made too many login attempts. Please wait and try again later." });
        } else if (isJson && (response.status === 401 || response.status === 403)) {
          toast({ title: "Error", description: result.message || "Unauthorized: Invalid credentials or access denied." });
        } else if (isJson) {
          toast({ title: "Error", description: result.message || "Login failed" });
        } else {
          toast({ title: "Error", description: result || "Login failed" });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({ title: "Error", description: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterClick = () => {
    setIsRegistering(true);
  };

  const handleBackToLogin = () => {
    setIsRegistering(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the CRM system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="identifier">Email or Phone Number</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="Enter your email or phone number"
                  {...register("identifier")}
                  className={errors.identifier ? "border-red-500" : ""}
                />
                {errors.identifier && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.identifier.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password")}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="store">Select Store (Optional for Admin)</Label>
                <Select
                  value={selectedStoreId}
                  onValueChange={(value) => setValue("store_id", value)}
                >
                  <SelectTrigger className={errors.store_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Choose your store (optional for admin)" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store._id} value={store._id}>
                        {store.name} - {typeof store.address === 'object' && store.address !== null
                          ? [store.address.street, store.address.city, store.address.state, store.address.zipCode, store.address.country].filter(Boolean).join(', ')
                          : store.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.store_id && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.store_id.message}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Admin users can access any store. Non-admin users must select their assigned store.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 