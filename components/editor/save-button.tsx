import React from 'react';
import { Button } from '@material-ui/core';
import useI18n from 'libs/web/hooks/use-i18n';
// 移除 Material-UI 图标导入
// import { SaveOutlined } from '@material-ui/icons';

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
            // 使用自定义 CSS 图标替代 Material-UI 图标
            startIcon={
                <div style={{
                    width: '16px',
                    height: '16px',
                    position: 'relative',
                    display: 'inline-block',
                    marginRight: '4px'
                }}>
                    <div style={{
                        width: '12px',
                        height: '14px',
                        border: '1px solid currentColor',
                        borderRadius: '1px',
                        position: 'absolute',
                        top: '0',
                        left: '2px'
                    }}></div>
                    <div style={{
                        width: '8px',
                        height: '2px',
                        backgroundColor: 'currentColor',
                        position: 'absolute',
                        top: '8px',
                        left: '4px'
                    }}></div>
                    <div style={{
                        width: '0',
                        height: '0',
                        borderStyle: 'solid',
                        borderWidth: '0 0 4px 4px',
                        borderColor: 'transparent transparent currentColor transparent',
                        position: 'absolute',
                        top: '0',
                        right: '2px'
                    }}></div>
                </div>
            }
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
