import { toast } from "react-toastify";

export const showSuccess = (message) => {
  toast.success(message || "Success");
};

export const showError = (message) => {
  toast.error(message || "Something went wrong");
};

export const showWarning = (message) => {
  toast.warning(message || "Warning");
};

export const showInfo = (message) => {
  toast.info(message || "Info");
};
