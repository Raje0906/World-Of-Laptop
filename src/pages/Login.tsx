import { useState, useEffect } from "react";
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
import { Eye, EyeOff, Loader2, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";

// Dynamic schema based on user role
const createLoginSchema = (isAdmin: boolean) => {
  const baseSchema = {
    identifier: z.string().min(1, "Email or phone number is required"),
    password: z.string().min(1, "Password is required"),
  };

  if (isAdmin) {
    // Admin users don't need store selection during login
    return z.object(baseSchema);
  } else {
    // Staff users must select a store
    return z.object({
      ...baseSchema,
      store_id: z.string().min(1, "Please select your assigned store"),
    });
  }
};

type LoginFormData = {
  identifier: string;
  password: string;
  store_id?: string;
};

type StoreAddress = {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

interface Store {
  _id: string;
  name: string;
  address: string | StoreAddress;
}

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  // Create dynamic schema based on user role
  const loginSchema = createLoginSchema(isAdmin);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const selectedStoreId = watch("store_id");

  const formatStoreAddress = (address: Store["address"]): string => {
    if (typeof address === "object" && address) {
      const a = address as StoreAddress;
      return [a.street, a.city, a.state, a.zipCode, a.country]
        .filter(Boolean)
        .join(", ");
    }
    return address || "";
  };

  useEffect(() => {
    const loadStores = async () => {
      await fetchStores();
    };
    loadStores();
  }, []);

  const fetchStores = async () => {
    try {
      console.log("Fetching stores...");
      const response = await apiClient.get("/auth/stores");
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      const contentType = response.headers.get("content-type");
      console.log("Content-Type:", contentType);
      
      if (!response.ok) {
        console.error("Response not ok:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("Error response body:", errorText);
        toast({ title: "Error", description: `Failed to fetch stores: ${response.status}` });
        return;
      }
      
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        console.log("Stores response:", data);
        
        if (data.success) {
          setStores(data.data.stores);
          console.log("Stores loaded:", data.data.stores);
        } else {
          toast({ title: "Error", description: "Failed to fetch stores" });
        }
      } else {
        const textResponse = await response.text();
        console.error("Non-JSON response:", textResponse);
        toast({ title: "Error", description: "Server returned non-JSON response" });
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast({ title: "Error", description: "Failed to fetch stores" });
    }
  };

  // Check if user is admin based on identifier (email/phone)
  const checkUserRole = async (identifier: string) => {
    if (identifier.length < 3) return null;
    // Avoid calling unsupported endpoint repeatedly
    if ((window as any).__DISABLE_CHECK_ROLE__ === true) {
      return null;
    }
    
    setIsCheckingRole(true);
    try {
      const response = await apiClient.post("/auth/check-role", { identifier });
      // Gracefully handle missing endpoint in older backends
      if (response.status === 404) {
        console.warn("/auth/check-role not found on backend. Defaulting to staff role (store required).");
        // Disable further attempts for this session
        (window as any).__DISABLE_CHECK_ROLE__ = true;
        setUserRole("staff");
        setIsAdmin(false);
        return "staff";
      }
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const role = data.data.role;
          setUserRole(role);
          setIsAdmin(role === 'admin');
          return role;
        }
      }
    } catch (error) {
      console.error("Error checking user role:", error);
    } finally {
      setIsCheckingRole(false);
    }
    return null;
  };

  const handleIdentifierChange = (identifier: string) => {
    setValue("identifier", identifier);
    if (identifier.length > 3 && (window as any).__DISABLE_CHECK_ROLE__ !== true) {
      checkUserRole(identifier);
    }
  };

  const handleIdentifierBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const identifier = e.target.value;
    if (identifier.length > 3 && (window as any).__DISABLE_CHECK_ROLE__ !== true) {
      checkUserRole(identifier);
    }
  };

  const handleRegisterClick = () => {
    setIsRegistering(true);
  };

  const handleBackToLogin = () => {
    setIsRegistering(false);
  };

  const onSubmit = async (data: LoginFormData) => {
    // Always check role before submit
    await checkUserRole(data.identifier);
    setIsLoading(true);
    
    try {
      // For staff users, store selection is required
      if (!isAdmin && !data.store_id) {
        toast({ title: "Error", description: "Please select your assigned store to log in" });
        setIsLoading(false);
        return;
      }

      // Prepare login payload
      const payload = {
        identifier: data.identifier,
        password: data.password,
        ...(data.store_id && { store_id: data.store_id })
      };

      const response = await apiClient.post("/auth/login", payload);

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
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  onBlur={handleIdentifierBlur}
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

              {/* Show store selection only for staff users */}
              {!isAdmin && (
                <div>
                  <Label htmlFor="store">Select Your Store</Label>
                  <Select
                    value={selectedStoreId}
                    onValueChange={(value) => setValue("store_id", value)}
                  >
                    <SelectTrigger className={errors.store_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Choose your assigned store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store._id} value={store._id}>
                          {store.name} - {formatStoreAddress(store.address)}
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
                    You must select your assigned store to log in.
                  </p>
                </div>
              )}

              {/* Show role indicator */}
              {userRole && (
                <Alert>
                  <AlertDescription className="flex items-center gap-2">
                    {isAdmin ? (
                      <>
                        <Shield className="h-4 w-4" />
                        Logging in as: <strong>{userRole}</strong> (Store selection not required)
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4" />
                        Logging in as: <strong>{userRole}</strong> (Store selection required)
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Show loading indicator while checking role */}
              {isCheckingRole && (
                <Alert>
                  <AlertDescription className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking user role...
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isCheckingRole}
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