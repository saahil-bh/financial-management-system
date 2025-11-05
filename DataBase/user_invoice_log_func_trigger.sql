CREATE OR REPLACE FUNCTION public.fn_log_invoice_changes()
  RETURNS TRIGGER
AS $$
DECLARE
  log_action TEXT;
  doc_id INT;
  actor_id_from_row UUID;
BEGIN
  ----------------------------------------------------------------
  -- On INSERT (When a new invoice is created)
  ----------------------------------------------------------------
  IF (TG_OP = 'INSERT') THEN
    doc_id := NEW.i_id;
    actor_id_from_row := NEW.u_id;
    log_action := 'Invoice ' || doc_id || ' created with status ' || NEW.status;

    INSERT INTO logs (action, actor_id, document_id, timestamp)
    VALUES (log_action, actor_id_from_row, doc_id, NOW());

    RETURN NEW;

  ----------------------------------------------------------------
  -- On UPDATE (When invoice status or info changes)
  ----------------------------------------------------------------
  ELSIF (TG_OP = 'UPDATE') THEN
    doc_id := NEW.i_id;
    actor_id_from_row := NEW.u_id;

    -- Only log if the status actually changes
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      log_action := 'Invoice ' || doc_id ||
                    ' status changed from ' || OLD.status ||
                    ' to ' || NEW.status;

      INSERT INTO logs (action, actor_id, document_id, timestamp)
      VALUES (log_action, actor_id_from_row, doc_id, NOW());
    END IF;

    RETURN NEW;

  ----------------------------------------------------------------
  -- On DELETE (When invoice is deleted)
  ----------------------------------------------------------------
  ELSIF (TG_OP = 'DELETE') THEN
    doc_id := OLD.i_id;
    actor_id_from_row := OLD.u_id;
    log_action := 'Invoice ' || doc_id || ' deleted.';

    INSERT INTO logs (action, actor_id, document_id, timestamp)
    VALUES (log_action, actor_id_from_row, doc_id, NOW());

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS tr_invoice_log ON Invoices;

CREATE TRIGGER tr_invoice_log
  AFTER INSERT OR UPDATE OR DELETE ON Invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_invoice_changes();
