import { ref } from 'vue';

/**
 * Shared Toast composable - eliminates repeated Toast setup across components
 * Usage:
 *   const { toast, showToast } = useToast();
 *   // In template: <Toast :message="toast.message" :type="toast.type" v-model:show="toast.show" />
 */
export function useToast() {
  const toast = ref({ show: false, message: '', type: 'info' });

  function showToast(message, type = 'info') {
    toast.value = { show: true, message, type };
  }

  return { toast, showToast };
}
