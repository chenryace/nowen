import React from 'react';
import { Button } from '@material-ui/core';
import useI18n from 'libs/web/hooks/use-i18n';
import { SaveOutlined } from '@material-ui/icons';

interface SaveButtonProps {
    onSave: () => void;
    disabled?: boolean;
}

const SaveButton: React.FC<SaveButtonProps> = ({ onSave, disabled }) => {
    const { t } = useI18n();
    
    return (
        <Button
            variant="contained"
            color="primary"
            startIcon={<SaveOutlined />}
            onClick={onSave}
            disabled={disabled}
            size="small"
            style={{ marginRight: '8px' }}
        >
            {t('Save')}
        </Button>
    );
};

export default SaveButton;
