<template>
  <dialog ref="dialog" class="theme-copy-dialog border rounded bg-body text-body"
    aria-labelledby="theme-copy-title" @cancel="onCancel">
    <form @submit.prevent="save">
      <h5 id="theme-copy-title">Save Current Settings as a Copy</h5>
      <p>This creates a new library theme without overwriting another theme or applying changes to the game.</p>
      <label for="theme-copy-name" class="form-label">New theme name</label>
      <input id="theme-copy-name" v-model="name" class="form-control" required maxlength="120"
        autocomplete="off" autofocus :disabled="saving" />
      <p v-if="error" class="text-danger mt-2" role="alert">{{ error }}</p>
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button type="button" class="btn btn-secondary" :disabled="saving" @click="close">Cancel</button>
        <button type="submit" class="btn btn-primary" :disabled="saving || !name.trim()">
          {{ saving ? 'Saving…' : 'Save Copy' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<script>
import EventBus from '../../EventBus';

export default {
  data: () => ({ name: '', error: '', saving: false }),
  methods: {
    show() {
      if (this.$refs.dialog.open) return;
      this.name = '';
      this.error = '';
      this.$refs.dialog.showModal();
    },
    close() {
      if (!this.saving) this.$refs.dialog.close();
    },
    onCancel(event) {
      if (this.saving) event.preventDefault();
    },
    async save() {
      if (this.saving) return;
      this.saving = true;
      this.error = '';
      try {
        const saved = await window.api.SaveThemeCopy(this.name);
        if (!saved) throw new Error('The theme copy could not be saved.');
        this.$refs.dialog.close();
        EventBus.emit('loadThemes');
        EventBus.emit('RoastMe', { type: 'Success', message: 'Current Settings saved as a new library theme.' });
      } catch (error) {
        this.error = error.message || String(error);
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.theme-copy-dialog { max-width: min(480px, 90vw); padding: 1.5rem; }
.theme-copy-dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
</style>
