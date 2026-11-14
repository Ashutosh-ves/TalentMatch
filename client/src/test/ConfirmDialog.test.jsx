import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('closes on Escape key press', () => {
    const handleClose = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        title="Delete Item"
        description="Are you sure you want to delete this item?"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking backdrop, but does not close when clicking dialog body', async () => {
    const handleClose = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        title="Confirm Action"
        description="Please confirm."
      />
    );

    // Clicking inside the dialog should not trigger onClose
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(handleClose).not.toHaveBeenCalled();

    // Clicking the backdrop should trigger onClose
    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the trigger element when closed', () => {
    function Wrapper({ isOpen }) {
      return (
        <div>
          <button data-testid="trigger-btn">Open Dialog</button>
          <ConfirmDialog
            isOpen={isOpen}
            onClose={vi.fn()}
            onConfirm={vi.fn()}
            title="Focus Test"
            description="Testing focus restore"
          />
        </div>
      );
    }

    const { rerender } = render(<Wrapper isOpen={false} />);
    const trigger = screen.getByTestId('trigger-btn');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open modal: activeElement moves inside modal
    rerender(<Wrapper isOpen={true} />);
    expect(document.activeElement).not.toBe(trigger);

    // Close modal: focus should restore to trigger
    rerender(<Wrapper isOpen={false} />);
    expect(document.activeElement).toBe(trigger);
  });
});
